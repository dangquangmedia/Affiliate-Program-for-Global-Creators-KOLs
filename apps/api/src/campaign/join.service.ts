import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, PrismaClientLike } from "../prisma.service";

// Hằng số Phase 1 (QĐ-4): SLA nộp bài kể từ lúc join.
const SUBMIT_SLA_HOURS = 48;
const MAX_STRIKES = 2; // QĐ-4/5: bị thu hồi vì ì >= 2 lần thì cấm join lại
// Trạng thái coi như "đang giữ chỗ" -> bấm join lại là idempotent, trả về nguyên trạng.
const HOLDING_STATES = new Set(["JOINED", "CONTENT_SUBMITTED", "APPROVED", "REJECTED", "WAITLISTED"]);
// Trạng thái vẫn CHIẾM 1 suất (khi rời/thu hồi thì mới trả suất). Dùng để quyết định tăng/giảm đếm.
const SLOT_HOLDING = new Set(["JOINED", "CONTENT_SUBMITTED", "APPROVED", "REJECTED"]);

export interface ParticipationDto {
  campaignId: string;
  campaignTitle?: string;
  state: string;
  snapshotRewardMinor: number | null;
  currency: string | null;
  submitDeadlineAt: string | null;
  waitlistedAt: string | null;
  joinedAt: string | null;
  strikeCount: number;
}

type CountryRow = { id: string; enabled: boolean };
type RewardRuleRow = { triggerType: string; pricingType: string };
type CampaignRow = {
  id: string;
  status: string;
  endsAt: Date | null;
  slotsTotal: number;
  slotsTaken: number;
  rewardMinor: bigint;
  currency: string;
  rewardRule: RewardRuleRow | null;
};
type ParticipationRow = {
  id: string;
  state: string;
  snapshotRewardMinor: bigint | null;
  snapshotCurrency: string | null;
  submitDeadlineAt: Date | null;
  waitlistedAt: Date | null;
  joinedAt: Date | null;
  strikeCount: number;
  rowVersion: number;
  campaign?: { title: string };
};

@Injectable()
export class JoinService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private conflict(code: string, message: string): never {
    throw new ConflictException({ code, message });
  }

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

  private async ensureProfileId(userId: string, countryId: string): Promise<string> {
    const p = await this.prisma.db.creatorCountryProfile.upsert({
      where: { userId_countryId: { userId, countryId } },
      create: { userId, countryId },
      update: {},
    });
    return p.id;
  }

  private toDto(p: ParticipationRow, campaignId: string): ParticipationDto {
    return {
      campaignId,
      campaignTitle: p.campaign?.title,
      state: p.state,
      snapshotRewardMinor: p.snapshotRewardMinor != null ? Number(p.snapshotRewardMinor) : null,
      currency: p.snapshotCurrency,
      submitDeadlineAt: p.submitDeadlineAt ? p.submitDeadlineAt.toISOString() : null,
      waitlistedAt: p.waitlistedAt ? p.waitlistedAt.toISOString() : null,
      joinedAt: p.joinedAt ? p.joinedAt.toISOString() : null,
      strikeCount: p.strikeCount,
    };
  }

  /**
   * Join race-safe (bài toán #3): khóa hàng campaign FOR UPDATE làm điểm serial-hóa, đếm suất
   * còn hiệu lực TRONG khóa, rồi mới ghi. UNIQUE(profile,campaign) chặn nhân đôi. Không oversell
   * dù N người bấm cùng lúc. Trả mã lỗi có kiểu để creator biết đúng lý do.
   */
  async join(userId: string, market: string, campaignId: string): Promise<ParticipationDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);

    return this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
      // 1) Khóa campaign (chỉ trong nước này) — người thứ 2 xếp hàng chờ khóa.
      const locked = (await tx.$queryRaw`
        SELECT id FROM campaign WHERE id = ${campaignId}::uuid AND country_id = ${country.id}::uuid FOR UPDATE
      `) as Array<{ id: string }>;
      if (locked.length === 0) {
        throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "Campaign not found in this country." });
      }

      const campaign = (await tx.campaign.findUnique({
        where: { id: campaignId },
        include: { rewardRule: true },
      })) as CampaignRow;

      // 2) Campaign có nhận join không?
      const joinable = campaign.status === "ACTIVE" && (!campaign.endsAt || campaign.endsAt.getTime() > Date.now());
      if (!joinable) {
        this.conflict("CAMPAIGN_NOT_JOINABLE", "Campaign is paused, ended, or past its deadline.");
      }

      // 3) Đã có participation? Đang giữ chỗ -> idempotent, trả nguyên trạng.
      const existing = (await tx.participation.findFirst({
        where: { profileId, campaignId },
      })) as ParticipationRow | null;
      if (existing && HOLDING_STATES.has(existing.state)) {
        return this.toDto(existing, campaignId);
      }

      // 4) Cổng KYC (QĐ-2): phải APPROVED mới được giữ suất.
      const kyc = (await tx.kycCase.findUnique({ where: { profileId } })) as { state: string } | null;
      if (!kyc || kyc.state !== "APPROVED") {
        this.conflict("KYC_REQUIRED", "KYC must be approved before joining (QĐ-2).");
      }

      // 5) Re-join sau khi bị thu hồi/tự rời: chặn nếu quá số strike.
      if (existing && existing.strikeCount >= MAX_STRIKES) {
        this.conflict("JOIN_BLOCKED_STRIKE", `Blocked after ${MAX_STRIKES} reclaimed slots on this campaign.`);
      }

      // 6) Sức chứa: đọc slots_taken TRONG khóa. "Đầy" = slots_taken >= slots_total (suy ra).
      if (campaign.slotsTaken >= campaign.slotsTotal) {
        // N10 core: từ chối SLOT_FULL. (N10b: thay bằng đưa vào waitlist.)
        this.conflict("SLOT_FULL", "The last slot was just taken by another creator.");
      }

      // 7) Ghi: snapshot điều khoản + hạn nộp + TĂNG đếm suất — tất cả trong cùng transaction/khóa.
      const snapshot = {
        state: "JOINED",
        joinedAt: new Date(),
        snapshotRewardMinor: campaign.rewardMinor,
        snapshotCurrency: campaign.currency,
        snapshotTriggerType: campaign.rewardRule?.triggerType ?? "CONTENT_APPROVED",
        snapshotPricingType: campaign.rewardRule?.pricingType ?? "FLAT",
        submitDeadlineAt: new Date(Date.now() + SUBMIT_SLA_HOURS * 3600_000),
        fixDeadlineAt: null,
        waitlistedAt: null,
      };

      const saved = (existing
        ? await tx.participation.update({
            where: { id: existing.id },
            data: { ...snapshot, rowVersion: { increment: 1 } },
          })
        : await tx.participation.create({
            data: { profileId, campaignId, countryId: country.id, ...snapshot },
          })) as ParticipationRow;

      await tx.campaign.update({ where: { id: campaignId }, data: { slotsTaken: { increment: 1 } } });

      return this.toDto(saved, campaignId);
    });
  }

  /** Creator tự rời suất (voluntary) -> LEFT, trả suất. Không tính strike. */
  async leave(userId: string, market: string, campaignId: string): Promise<ParticipationDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);

    const existing = (await this.prisma.db.participation.findFirst({
      where: { profileId, campaignId },
    })) as ParticipationRow | null;
    if (!existing) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "You have not joined this campaign." });
    }
    if (existing.state === "APPROVED") {
      this.conflict("ALREADY_DELIVERED", "Cannot leave a campaign you have already delivered.");
    }
    if (!SLOT_HOLDING.has(existing.state)) {
      // Không đang giữ suất (đã LEFT/EXPIRED/WAITLISTED) -> trả nguyên trạng, không giảm đếm.
      return this.toDto(existing, campaignId);
    }
    const saved = (await this.prisma.db.participation.update({
      where: { id: existing.id },
      data: { state: "LEFT", rowVersion: { increment: 1 } },
    })) as ParticipationRow;
    // Trả suất: giảm đếm nguyên tử (UPDATE khóa hàng campaign nên an toàn với join song song).
    await this.prisma.db.campaign.update({
      where: { id: campaignId },
      data: { slotsTaken: { decrement: 1 } },
    });
    return this.toDto(saved, campaignId);
  }

  /** My Campaigns: participations của creator trong 1 nước (ẩn LEFT). */
  async listMine(userId: string, market: string): Promise<ParticipationDto[]> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);
    const rows = (await this.prisma.db.participation.findMany({
      where: { profileId, state: { not: "LEFT" } },
      include: { campaign: true },
      orderBy: { joinedAt: "desc" },
    })) as (ParticipationRow & { campaignId: string })[];
    return rows.map((p) => this.toDto(p, p.campaignId));
  }
}
