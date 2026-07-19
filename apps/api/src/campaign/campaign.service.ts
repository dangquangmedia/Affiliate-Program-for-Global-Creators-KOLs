import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthContext } from "../auth/auth.service";
import { assertStaffForCountry } from "../auth/rbac";

// Tiền là BigInt trong DB; ra ngoài JSON dùng number (minor units, < 2^53 nên an toàn).
export interface CampaignSummary {
  id: string;
  title: string;
  brand: string;
  platform: string;
  requiredHashtag: string;
  currency: string;
  rewardMinor: number;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  slotsTotal: number;
  slotsTaken: number;
  slotsLeft: number;
  full: boolean; // SUY RA từ slots, KHÔNG lưu (mentor Q4)
}
export interface RewardRuleDto {
  triggerType: string;
  pricingType: string;
  capType: string;
  flatAmountMinor: number | null;
  capSlots: number | null;
  budgetCapMinor: number | null; // = capSlots × flatAmount (trần CỐ ĐỊNH vì FLAT)
}
export interface CampaignDetail extends CampaignSummary {
  brief: string;
  reward: RewardRuleDto | null;
}
export interface CreateCampaignInput {
  title: string;
  brand: string;
  platform: string;
  requiredHashtag: string;
  brief: string;
  rewardMinor: number;
  slotsTotal: number;
}

const ADMIN_ROLES = ["LOCAL_ADMIN"];

type CountryRow = { id: string; code: string; currencyCode: string; enabled: boolean };
type RewardRuleRow = {
  triggerType: string;
  pricingType: string;
  capType: string;
  flatAmountMinor: bigint | null;
  capSlots: number | null;
};
type CampaignRow = {
  id: string;
  brand: string;
  title: string;
  rewardMinor: bigint;
  currency: string;
  slotsTotal: number;
  slotsTaken: number;
  status: "ACTIVE" | "PAUSED" | "ENDED";
  platform: string;
  requiredHashtag: string;
  brief: string;
  rewardRule: RewardRuleRow | null;
};

@Injectable()
export class CampaignService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async requireCountry(market: string): Promise<CountryRow> {
    const code = market.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: `"${market}" is not a market.` });
    }
    const country = (await this.prisma.db.country.findUnique({ where: { code } })) as CountryRow | null;
    if (!country || !country.enabled) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: `Market "${code}" is not available.` });
    }
    return country;
  }

  private toSummary(c: CampaignRow): CampaignSummary {
    const slotsLeft = c.slotsTotal - c.slotsTaken;
    return {
      id: c.id,
      title: c.title,
      brand: c.brand,
      platform: c.platform,
      requiredHashtag: c.requiredHashtag,
      currency: c.currency,
      rewardMinor: Number(c.rewardMinor),
      status: c.status,
      slotsTotal: c.slotsTotal,
      slotsTaken: c.slotsTaken,
      slotsLeft,
      full: slotsLeft <= 0,
    };
  }

  private toDetail(c: CampaignRow): CampaignDetail {
    const r = c.rewardRule;
    const flat = r?.flatAmountMinor != null ? Number(r.flatAmountMinor) : null;
    return {
      ...this.toSummary(c),
      brief: c.brief,
      reward: r
        ? {
            triggerType: r.triggerType,
            pricingType: r.pricingType,
            capType: r.capType,
            flatAmountMinor: flat,
            capSlots: r.capSlots,
            budgetCapMinor: flat != null && r.capSlots != null ? flat * r.capSlots : null,
          }
        : null,
    };
  }

  /** Discover: campaign của ĐÚNG nước đang xem (VN không thấy PH — bài toán #1). */
  async listForMarket(market: string): Promise<CampaignSummary[]> {
    const country = await this.requireCountry(market);
    const rows = (await this.prisma.db.campaign.findMany({
      where: { countryId: country.id },
      include: { rewardRule: true },
      orderBy: { createdAt: "desc" },
    })) as CampaignRow[];
    return rows.map((c) => this.toSummary(c));
  }

  /**
   * Gợi ý campaign tương tự (QĐ-5, read-only): dùng khi creator hết suất/đang chờ. Cùng nước,
   * còn ĐANG NHẬN + CÒN SUẤT, khác chính nó; ưu tiên cùng nền tảng rồi reward gần giá trị. Top 3.
   */
  async suggestSimilar(market: string, id: string): Promise<CampaignSummary[]> {
    const country = await this.requireCountry(market);
    const target = (await this.prisma.db.campaign.findFirst({
      where: { id, countryId: country.id },
    })) as CampaignRow | null;
    if (!target) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "Campaign not found in this country." });
    }
    const rows = (await this.prisma.db.campaign.findMany({
      where: { countryId: country.id, status: "ACTIVE" },
      include: { rewardRule: true },
      orderBy: { createdAt: "desc" },
    })) as CampaignRow[];

    const targetReward = Number(target.rewardMinor);
    const withRoom = rows.filter((c) => c.id !== id && c.slotsTaken < c.slotsTotal);
    withRoom.sort((a, b) => {
      const pa = a.platform === target.platform ? 0 : 1;
      const pb = b.platform === target.platform ? 0 : 1;
      if (pa !== pb) return pa - pb; // cùng nền tảng lên trước
      return Math.abs(Number(a.rewardMinor) - targetReward) - Math.abs(Number(b.rewardMinor) - targetReward);
    });
    return withRoom.slice(0, 3).map((c) => this.toSummary(c));
  }

  /** Detail: 404 nếu campaign không thuộc nước này (id PH mở dưới /vn → không lộ). */
  async getForMarket(market: string, id: string): Promise<CampaignDetail> {
    const country = await this.requireCountry(market);
    const row = (await this.prisma.db.campaign.findFirst({
      where: { id, countryId: country.id },
      include: { rewardRule: true },
    })) as CampaignRow | null;
    if (!row) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "Campaign not found in this country." });
    }
    return this.toDetail(row);
  }

  /**
   * Local Admin tạo campaign + reward_rule 3 trục. Phase 1 KHÓA cấu hình an toàn:
   * ① CONTENT_APPROVED · ② FLAT · ③ SLOTS_X_PRICE. Trần ngân sách = suất × đơn giá (cố định,
   * không thể vỡ — câu trả lời điểm "cấn" của mentor). Currency ép theo nước.
   */
  async create(auth: AuthContext, market: string, input: CreateCampaignInput): Promise<CampaignDetail> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, ADMIN_ROLES);

    const title = input.title?.trim();
    if (!title) throw new BadRequestException({ code: "VALIDATION_ERROR", message: "Title is required." });
    if (!Number.isInteger(input.rewardMinor) || input.rewardMinor <= 0) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "rewardMinor must be a positive integer." });
    }
    if (!Number.isInteger(input.slotsTotal) || input.slotsTotal <= 0) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: "slotsTotal must be a positive integer." });
    }

    const row = (await this.prisma.db.campaign.create({
      data: {
        countryId: country.id,
        brand: input.brand?.trim() || "—",
        title,
        rewardMinor: BigInt(input.rewardMinor),
        currency: country.currencyCode,
        slotsTotal: input.slotsTotal,
        slotsTaken: 0,
        status: "ACTIVE",
        platform: input.platform?.trim() || "—",
        requiredHashtag: input.requiredHashtag?.trim() || "",
        brief: input.brief?.trim() || "",
        rewardRule: {
          create: {
            triggerType: "CONTENT_APPROVED",
            pricingType: "FLAT",
            flatAmountMinor: BigInt(input.rewardMinor),
            capType: "SLOTS_X_PRICE",
            capSlots: input.slotsTotal,
          },
        },
      },
      include: { rewardRule: true },
    })) as CampaignRow;

    return this.toDetail(row);
  }
}
