import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, PrismaClientLike } from "../prisma.service";

// Hằng số Phase 1 (QĐ-4): SLA cuốn theo từng creator kể từ lúc join/được đôn.
const SUBMIT_SLA_HOURS = 48; // hạn nộp bài sau khi giữ suất
const FIX_SLA_HOURS = 24; // hạn sửa sau khi bị Ops từ chối (dùng khi N11 có review)
const MAX_STRIKES = 2; // QĐ-4/5: bị thu hồi vì ì >= 2 lần thì cấm join lại
// Trạng thái coi như "đang giữ chỗ HOẶC đang chờ" -> bấm join lại là idempotent, trả nguyên trạng.
const HOLDING_STATES = new Set(["JOINED", "CONTENT_SUBMITTED", "APPROVED", "REJECTED", "WAITLISTED"]);
// Trạng thái CHIẾM 1 suất thật (khi rời/thu hồi mới trả suất). WAITLISTED KHÔNG chiếm suất.
const SLOT_HOLDING = new Set(["JOINED", "CONTENT_SUBMITTED", "APPROVED", "REJECTED"]);

export interface ParticipationDto {
  campaignId: string;
  campaignTitle?: string;
  state: string;
  snapshotRewardMinor: number | null;
  currency: string | null;
  submitDeadlineAt: string | null;
  waitlistedAt: string | null;
  waitlistPosition: number | null; // vị trí trong hàng chờ (chỉ khi WAITLISTED)
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
  campaignId: string;
  state: string;
  snapshotRewardMinor: bigint | null;
  snapshotCurrency: string | null;
  submitDeadlineAt: Date | null;
  fixDeadlineAt: Date | null;
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

  private toDto(p: ParticipationRow, campaignId: string, waitlistPosition: number | null = null): ParticipationDto {
    return {
      campaignId,
      campaignTitle: p.campaign?.title,
      state: p.state,
      snapshotRewardMinor: p.snapshotRewardMinor != null ? Number(p.snapshotRewardMinor) : null,
      currency: p.snapshotCurrency,
      submitDeadlineAt: p.submitDeadlineAt ? p.submitDeadlineAt.toISOString() : null,
      waitlistedAt: p.waitlistedAt ? p.waitlistedAt.toISOString() : null,
      waitlistPosition,
      joinedAt: p.joinedAt ? p.joinedAt.toISOString() : null,
      strikeCount: p.strikeCount,
    };
  }

  // Điều khoản snapshot lúc GIỮ SUẤT (join mới hoặc được đôn từ waitlist) + hạn nộp mới.
  private joinSnapshot(campaign: CampaignRow): Record<string, unknown> {
    const now = Date.now();
    return {
      state: "JOINED",
      joinedAt: new Date(now),
      snapshotRewardMinor: campaign.rewardMinor,
      snapshotCurrency: campaign.currency,
      snapshotTriggerType: campaign.rewardRule?.triggerType ?? "CONTENT_APPROVED",
      snapshotPricingType: campaign.rewardRule?.pricingType ?? "FLAT",
      submitDeadlineAt: new Date(now + SUBMIT_SLA_HOURS * 3600_000),
      fixDeadlineAt: null,
      waitlistedAt: null,
    };
  }

  private isJoinable(campaign: CampaignRow): boolean {
    return campaign.status === "ACTIVE" && (!campaign.endsAt || campaign.endsAt.getTime() > Date.now());
  }

  // Vị trí FCFS trong hàng chờ = số người WAITLISTED có waitlisted_at sớm hơn + 1.
  private async waitlistPosition(tx: PrismaClientLike, campaignId: string, waitlistedAt: Date | null): Promise<number | null> {
    if (!waitlistedAt) return null;
    const ahead = await tx.participation.count({
      where: { campaignId, state: "WAITLISTED", waitlistedAt: { lt: waitlistedAt } },
    });
    return ahead + 1;
  }

  /**
   * Tự đôn 1 người từ hàng chờ vào suất vừa trống (QĐ-5). PHẢI gọi TRONG transaction đã khóa
   * campaign (leave/reclaim). Lấy WAITLISTED sớm nhất (FCFS) → JOINED + snapshot LÚC ĐÔN + hạn
   * nộp mới. Trả true nếu có người được đôn.
   */
  private async promoteNextWaitlisted(tx: PrismaClientLike, campaignId: string): Promise<boolean> {
    const campaign = (await tx.campaign.findUnique({
      where: { id: campaignId },
      include: { rewardRule: true },
    })) as CampaignRow;
    if (!this.isJoinable(campaign)) return false; // campaign dừng/hết hạn thì không đôn
    if (campaign.slotsTaken >= campaign.slotsTotal) return false; // không còn chỗ

    const next = (await tx.participation.findFirst({
      where: { campaignId, state: "WAITLISTED" },
      orderBy: { waitlistedAt: "asc" },
    })) as ParticipationRow | null;
    if (!next) return false;

    await tx.participation.update({
      where: { id: next.id },
      data: { ...this.joinSnapshot(campaign), rowVersion: { increment: 1 } },
    });
    await tx.campaign.update({ where: { id: campaignId }, data: { slotsTaken: { increment: 1 } } });
    return true;
  }

  /**
   * Join race-safe (bài toán #3): khóa hàng campaign FOR UPDATE làm điểm serial-hóa, đếm suất
   * còn hiệu lực TRONG khóa, rồi mới ghi. UNIQUE(profile,campaign) chặn nhân đôi. Không oversell
   * dù N người bấm cùng lúc. HẾT SUẤT → vào hàng chờ (WAITLISTED) thay vì chỉ báo lỗi (QĐ-5).
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
      if (!this.isJoinable(campaign)) {
        this.conflict("CAMPAIGN_NOT_JOINABLE", "Campaign is paused, ended, or past its deadline.");
      }

      // 3) Đã có participation? Đang giữ chỗ hoặc đang chờ -> idempotent, trả nguyên trạng.
      const existing = (await tx.participation.findFirst({
        where: { profileId, campaignId },
      })) as ParticipationRow | null;
      if (existing && HOLDING_STATES.has(existing.state)) {
        const pos = existing.state === "WAITLISTED"
          ? await this.waitlistPosition(tx, campaignId, existing.waitlistedAt)
          : null;
        return this.toDto(existing, campaignId, pos);
      }

      // 4) Cổng KYC (QĐ-2): phải APPROVED mới được giữ suất / vào hàng chờ.
      const kyc = (await tx.kycCase.findUnique({ where: { profileId } })) as { state: string } | null;
      if (!kyc || kyc.state !== "APPROVED") {
        this.conflict("KYC_REQUIRED", "KYC must be approved before joining (QĐ-2).");
      }

      // 5) Re-join sau khi bị thu hồi vì ì: chặn nếu quá số strike (không áp cho người thua race).
      if (existing && existing.strikeCount >= MAX_STRIKES) {
        this.conflict("JOIN_BLOCKED_STRIKE", `Blocked after ${MAX_STRIKES} reclaimed slots on this campaign.`);
      }

      // 6) Sức chứa: đọc slots_taken TRONG khóa. HẾT SUẤT -> vào hàng chờ FCFS (QĐ-5).
      if (campaign.slotsTaken >= campaign.slotsTotal) {
        const waitlistedAt = new Date();
        const waitData = {
          state: "WAITLISTED",
          waitlistedAt,
          // xóa mọi snapshot cũ: chưa có suất thì chưa có điều khoản.
          snapshotRewardMinor: null,
          snapshotCurrency: null,
          snapshotTriggerType: null,
          snapshotPricingType: null,
          submitDeadlineAt: null,
          fixDeadlineAt: null,
        };
        const waited = (existing
          ? await tx.participation.update({
              where: { id: existing.id },
              data: { ...waitData, rowVersion: { increment: 1 } },
            })
          : await tx.participation.create({
              data: { profileId, campaignId, countryId: country.id, ...waitData },
            })) as ParticipationRow;
        const pos = await this.waitlistPosition(tx, campaignId, waitlistedAt);
        return this.toDto(waited, campaignId, pos);
      }

      // 7) Còn suất: snapshot điều khoản + hạn nộp + TĂNG đếm suất — tất cả trong cùng khóa.
      const saved = (existing
        ? await tx.participation.update({
            where: { id: existing.id },
            data: { ...this.joinSnapshot(campaign), rowVersion: { increment: 1 } },
          })
        : await tx.participation.create({
            data: { profileId, campaignId, countryId: country.id, ...this.joinSnapshot(campaign) },
          })) as ParticipationRow;

      await tx.campaign.update({ where: { id: campaignId }, data: { slotsTaken: { increment: 1 } } });

      return this.toDto(saved, campaignId);
    });
  }

  /**
   * Creator tự rời (voluntary) -> LEFT. Nếu đang chiếm suất thật thì trả suất + tự đôn 1 người
   * từ hàng chờ (trong khóa campaign). Rời khỏi hàng chờ thì chỉ set LEFT, không đụng đếm suất.
   * Không tính strike (rời chủ động không phải ì).
   */
  async leave(userId: string, market: string, campaignId: string): Promise<ParticipationDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);

    return this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
      await tx.$queryRaw`
        SELECT id FROM campaign WHERE id = ${campaignId}::uuid AND country_id = ${country.id}::uuid FOR UPDATE
      `;
      const existing = (await tx.participation.findFirst({
        where: { profileId, campaignId },
      })) as ParticipationRow | null;
      if (!existing) {
        throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "You have not joined this campaign." });
      }
      if (existing.state === "APPROVED") {
        this.conflict("ALREADY_DELIVERED", "Cannot leave a campaign you have already delivered.");
      }
      if (!SLOT_HOLDING.has(existing.state)) {
        // WAITLISTED/LEFT/EXPIRED: không chiếm suất. Nếu đang chờ thì rút khỏi hàng chờ.
        if (existing.state === "WAITLISTED") {
          const saved = (await tx.participation.update({
            where: { id: existing.id },
            data: { state: "LEFT", waitlistedAt: null, rowVersion: { increment: 1 } },
          })) as ParticipationRow;
          return this.toDto(saved, campaignId);
        }
        return this.toDto(existing, campaignId);
      }
      const saved = (await tx.participation.update({
        where: { id: existing.id },
        data: { state: "LEFT", rowVersion: { increment: 1 } },
      })) as ParticipationRow;
      // Trả suất rồi tự đôn: nếu có người chờ, đếm suất về nguyên (net 0) — không ai bị "kẹt" oan.
      await tx.campaign.update({ where: { id: campaignId }, data: { slotsTaken: { decrement: 1 } } });
      await this.promoteNextWaitlisted(tx, campaignId);
      return this.toDto(saved, campaignId);
    });
  }

  /** My Campaigns: participations của creator trong 1 nước (ẩn LEFT), kèm vị trí hàng chờ. */
  async listMine(userId: string, market: string): Promise<ParticipationDto[]> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);
    const rows = (await this.prisma.db.participation.findMany({
      where: { profileId, state: { not: "LEFT" } },
      include: { campaign: true },
      orderBy: { joinedAt: "desc" },
    })) as ParticipationRow[];
    return Promise.all(
      rows.map(async (p) => {
        const pos = p.state === "WAITLISTED" ? await this.waitlistPosition(this.prisma.db, p.campaignId, p.waitlistedAt) : null;
        return this.toDto(p, p.campaignId, pos);
      }),
    );
  }

  /**
   * Worker thu hồi suất (QĐ-4) — LOGIC THUẦN, test được (scheduler chỉ gọi định kỳ). Chỉ thu
   * hồi khi "bóng ở chân creator": JOINED quá hạn nộp / REJECTED quá hạn sửa. CONTENT_SUBMITTED &
   * APPROVED miễn nhiễm (đồng hồ dừng khi chờ Ops / đã giao). Mỗi lần thu hồi: EXPIRED + tăng
   * strike + trả suất + tự đôn người chờ. Khóa từng campaign để an toàn với join/leave song song.
   */
  async reclaimExpired(now: Date = new Date()): Promise<{ reclaimed: number; promoted: number }> {
    const candidates = (await this.prisma.db.participation.findMany({
      where: {
        OR: [
          { state: "JOINED", submitDeadlineAt: { lt: now } },
          { state: "REJECTED", fixDeadlineAt: { lt: now } },
        ],
      },
    })) as ParticipationRow[];

    let reclaimed = 0;
    let promoted = 0;
    for (const cand of candidates) {
      const res = await this.reclaimOne(cand.id, cand.campaignId, now);
      if (res.reclaimed) reclaimed++;
      if (res.promoted) promoted++;
    }
    return { reclaimed, promoted };
  }

  // Thu hồi 1 suất trong khóa campaign; RE-KIỂM trong khóa vì creator có thể vừa nộp/rời.
  private async reclaimOne(
    participationId: string,
    campaignId: string,
    now: Date,
  ): Promise<{ reclaimed: boolean; promoted: boolean }> {
    return this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
      await tx.$queryRaw`SELECT id FROM campaign WHERE id = ${campaignId}::uuid FOR UPDATE`;
      const p = (await tx.participation.findFirst({ where: { id: participationId } })) as ParticipationRow | null;
      if (!p) return { reclaimed: false, promoted: false };

      const overdue =
        (p.state === "JOINED" && p.submitDeadlineAt != null && p.submitDeadlineAt.getTime() < now.getTime()) ||
        (p.state === "REJECTED" && p.fixDeadlineAt != null && p.fixDeadlineAt.getTime() < now.getTime());
      if (!overdue) return { reclaimed: false, promoted: false };

      await tx.participation.update({
        where: { id: participationId },
        data: { state: "EXPIRED", strikeCount: { increment: 1 }, rowVersion: { increment: 1 } },
      });
      await tx.campaign.update({ where: { id: campaignId }, data: { slotsTaken: { decrement: 1 } } });
      const promoted = await this.promoteNextWaitlisted(tx, campaignId);
      return { reclaimed: true, promoted };
    });
  }
}

export { FIX_SLA_HOURS };
