import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, PrismaClientLike } from "../prisma.service";
import { AuthContext } from "../auth/auth.service";
import { assertStaffForCountry } from "../auth/rbac";
import { FIX_SLA_HOURS } from "../campaign/join.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuditService } from "../audit/audit.service";

const OPS_ROLES = ["LOCAL_OPS", "LOCAL_ADMIN"];

// Nền tảng -> domain hợp lệ (kiểm sơ bộ). Không có trong map -> không chặn (advisory).
const PLATFORM_DOMAINS: Record<string, string[]> = {
  tiktok: ["tiktok.com"],
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com", "fb.com", "fb.watch"],
};

export interface SubmissionDto {
  id: string;
  attemptNo: number;
  url: string;
  state: string;
  rejectReason: string | null;
  hashtagOk: boolean;
  platformOk: boolean;
  createdAt: string;
}
export interface MyContentDto {
  participationState: string;
  campaignTitle: string | null;
  requiredHashtag: string | null;
  platform: string | null;
  fixDeadlineAt: string | null;
  submissions: SubmissionDto[]; // mới nhất trước
}
export interface ContentQueueItem {
  submissionId: string;
  creatorName: string;
  campaignTitle: string;
  url: string;
  attemptNo: number;
  hashtagOk: boolean;
  platformOk: boolean;
  submittedAt: string;
}

type CountryRow = { id: string; enabled: boolean };
type CampaignLite = { title: string; platform: string; requiredHashtag: string };
type ParticipationRow = {
  id: string;
  profileId: string;
  countryId: string;
  state: string;
  snapshotRewardMinor: bigint | null;
  snapshotCurrency: string | null;
  fixDeadlineAt: Date | null;
  campaign?: CampaignLite;
};
type SubmissionRow = {
  id: string;
  participationId: string;
  attemptNo: number;
  url: string;
  state: string;
  rejectReason: string | null;
  hashtagOk: boolean;
  platformOk: boolean;
  createdAt: Date;
  participation?: ParticipationRow & { profile: { user: { displayName: string } }; campaign: CampaignLite };
};

@Injectable()
export class ContentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private conflict(code: string, message: string): never {
    throw new ConflictException({ code, message });
  }
  private badRequest(message: string): never {
    throw new BadRequestException({ code: "VALIDATION_ERROR", message });
  }
  private notFound(message: string): never {
    throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message });
  }

  private async requireCountry(market: string): Promise<CountryRow> {
    const code = market.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) this.notFound(`"${market}" is not a market.`);
    const country = (await this.prisma.db.country.findUnique({ where: { code } })) as CountryRow | null;
    if (!country || !country.enabled) this.notFound(`Market "${code}" is not available.`);
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

  private toDto(s: SubmissionRow): SubmissionDto {
    return {
      id: s.id,
      attemptNo: s.attemptNo,
      url: s.url,
      state: s.state,
      rejectReason: s.rejectReason,
      hashtagOk: s.hashtagOk,
      platformOk: s.platformOk,
      createdAt: s.createdAt.toISOString(),
    };
  }

  // Kiểm sơ bộ nền tảng từ hostname URL. Sai nền tảng = chắc chắn nhầm -> chặn sớm cho creator.
  private platformOk(url: URL, platform: string): boolean {
    const domains = PLATFORM_DOMAINS[platform.trim().toLowerCase()];
    if (!domains) return true; // nền tảng lạ -> không chặn, Ops tự xem
    const host = url.hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith("." + d));
  }

  /**
   * Creator nộp content (V06). Chỉ khi ĐANG GIỮ SUẤT và bóng ở chân mình: JOINED (nộp lần đầu)
   * hoặc REJECTED (nộp lại). Nộp xong -> CONTENT_SUBMITTED: đồng hồ thu hồi DỪNG (QĐ-4 — chờ
   * Ops không bị phạt). Mỗi lần nộp = 1 dòng mới (attempt_no tăng, supersedes trỏ bản bị từ chối).
   */
  async submit(userId: string, market: string, campaignId: string, urlRaw: string, caption: string): Promise<MyContentDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);

    const p = (await this.prisma.db.participation.findFirst({
      where: { profileId, campaignId },
      include: { campaign: true },
    })) as ParticipationRow | null;
    if (!p || !p.campaign) this.notFound("You have not joined this campaign.");

    if (p.state === "APPROVED") this.conflict("ALREADY_DELIVERED", "Content already approved for this campaign.");
    if (p.state === "CONTENT_SUBMITTED") this.conflict("SUBMISSION_PENDING", "Your submission is waiting for review.");
    if (p.state !== "JOINED" && p.state !== "REJECTED") {
      this.conflict("NOT_HOLDING_SLOT", "You must hold a slot (JOINED) to submit content.");
    }

    let url: URL;
    try {
      url = new URL(urlRaw.trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
    } catch {
      this.badRequest("A valid http(s) post URL is required.");
    }
    const platformOk = this.platformOk(url, p.campaign.platform);
    if (!platformOk) {
      // Sai nền tảng là lỗi chắc chắn (dán link Facebook cho campaign TikTok) -> chặn sớm.
      this.badRequest(`URL must be a ${p.campaign.platform} link.`);
    }
    // Hashtag: kiểm trên caption creator dán vào (advisory — hashtag có thể nằm trong video;
    // KHÔNG chặn, chỉ gắn cờ để Ops thấy "Cần xem"). Caption không lưu (không có cột — lean).
    const tag = p.campaign.requiredHashtag.trim().toLowerCase();
    const hashtagOk = tag === "" || caption.toLowerCase().includes(tag);

    const attemptNo = (await this.prisma.db.submission.count({ where: { participationId: p.id } })) + 1;
    const lastRejected = (await this.prisma.db.submission.findFirst({
      where: { participationId: p.id, state: "REJECTED" },
      orderBy: { attemptNo: "desc" },
    })) as SubmissionRow | null;

    await this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
      await tx.submission.create({
        data: {
          participationId: p.id,
          attemptNo,
          supersedesId: lastRejected?.id ?? null,
          url: url.toString(),
          platform: p.campaign!.platform,
          hashtagOk,
          platformOk,
          state: "SUBMITTED",
        },
      });
      await tx.participation.update({
        where: { id: p.id },
        data: { state: "CONTENT_SUBMITTED", rowVersion: { increment: 1 } },
      });
    });

    return this.myContent(userId, market, campaignId);
  }

  /** V06: trạng thái nộp bài của creator cho 1 campaign (chuỗi attempt, mới nhất trước). */
  async myContent(userId: string, market: string, campaignId: string): Promise<MyContentDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);
    const p = (await this.prisma.db.participation.findFirst({
      where: { profileId, campaignId },
      include: { campaign: true },
    })) as ParticipationRow | null;
    if (!p) this.notFound("You have not joined this campaign.");
    const rows = (await this.prisma.db.submission.findMany({
      where: { participationId: p.id },
      orderBy: { attemptNo: "desc" },
    })) as SubmissionRow[];
    return {
      participationState: p.state,
      campaignTitle: p.campaign?.title ?? null,
      requiredHashtag: p.campaign?.requiredHashtag ?? null,
      platform: p.campaign?.platform ?? null,
      fixDeadlineAt: p.fixDeadlineAt ? p.fixDeadlineAt.toISOString() : null,
      submissions: rows.map((s) => this.toDto(s)),
    };
  }

  /** Ops: hàng đợi content chờ duyệt của NƯỚC MÌNH (cách ly như KYC queue). */
  async getQueue(auth: AuthContext, market: string): Promise<ContentQueueItem[]> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, OPS_ROLES);
    const rows = (await this.prisma.db.submission.findMany({
      where: { state: "SUBMITTED", participation: { countryId: country.id } },
      include: { participation: { include: { profile: { include: { user: true } }, campaign: true } } },
      orderBy: { createdAt: "asc" },
    })) as SubmissionRow[];
    return rows.map((s) => ({
      submissionId: s.id,
      creatorName: s.participation!.profile.user.displayName,
      campaignTitle: s.participation!.campaign.title,
      url: s.url,
      attemptNo: s.attemptNo,
      hashtagOk: s.hashtagOk,
      platformOk: s.platformOk,
      submittedAt: s.createdAt.toISOString(),
    }));
  }

  /**
   * Ops duyệt content — 2 bài toán khó trong 1 hàm:
   * #7 (xung đột 2 Ops): "claim" bằng UPDATE có điều kiện `WHERE state='SUBMITTED'` trong
   *    transaction — người thứ 2 (kể cả double-click song song) match 0 hàng -> 409 ALREADY_REVIEWED.
   * #3 (exactly-once earning): earning chỉ được tạo bởi người claim thành công; UNIQUE
   *    (submission_id) trong DB là chốt chặn cuối — dù code sai cũng không thể có 2 earning.
   * Approve: earning PENDING (gross = snapshot lúc join, tax theo nước) + participation APPROVED.
   * Reject: bắt buộc lý do; participation REJECTED + fix_deadline_at = now+24h (QĐ-4 — đồng hồ
   * sửa bài bắt đầu chạy; quá hạn thì worker thu hồi).
   */
  async review(
    auth: AuthContext,
    market: string,
    submissionId: string,
    decision: "APPROVE" | "REJECT",
    reason?: string,
  ): Promise<SubmissionDto> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, OPS_ROLES);

    const sub = (await this.prisma.db.submission.findFirst({
      where: { id: submissionId },
      include: { participation: true },
    })) as SubmissionRow | null;
    // Không thuộc nước Ops (hoặc không tồn tại) -> 404, không lộ tồn tại (bài toán #1).
    if (!sub || !sub.participation || sub.participation.countryId !== country.id) {
      this.notFound("Submission not found in this country.");
    }

    if (decision === "REJECT" && !reason?.trim()) {
      this.badRequest("Reason is required to reject a submission.");
    }

    const p = sub.participation;
    const nextState = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    const updated = await this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
      // Claim: chỉ 1 reviewer thắng. UPDATE khóa hàng; kẻ đến sau match 0 hàng vì state đã đổi.
      const claimed = (await tx.$queryRaw`
        UPDATE content_submission
        SET state = ${nextState}::"SubmissionState",
            reject_reason = ${decision === "REJECT" ? reason!.trim() : null},
            reviewed_by = ${auth.user.id}::uuid,
            reviewed_at = now(),
            row_version = row_version + 1
        WHERE id = ${submissionId}::uuid AND state = 'SUBMITTED'
        RETURNING id
      `) as Array<{ id: string }>;
      if (claimed.length === 0) {
        this.conflict("ALREADY_REVIEWED", "This submission has already been reviewed.");
      }

      if (decision === "APPROVE") {
        // Thu nhập từ SNAPSHOT lúc join (bài toán #5) — admin đổi giá sau không hồi tố.
        const gross = p.snapshotRewardMinor ?? 0n;
        const config = (await tx.countryConfig.findUnique({ where: { countryId: country.id } })) as
          | { taxPercent: number }
          | null;
        const tax = (gross * BigInt(config?.taxPercent ?? 0)) / 100n;
        const currency = p.snapshotCurrency ?? "VND";
        const earning = (await tx.earning.create({
          data: {
            participationId: p.id,
            submissionId, // UNIQUE -> exactly-once, chốt chặn cuối trong DB
            countryId: country.id,
            profileId: p.profileId,
            grossMinor: gross,
            taxMinor: tax,
            currency,
            status: "PENDING",
          },
        })) as { id: string };
        // Ghi sổ cái NGAY trong transaction (N12): +gross / −tax. Earning và sổ cái luôn nhất quán.
        await this.ledger.postEarningAccrual(tx, {
          id: earning.id,
          countryId: country.id,
          profileId: p.profileId,
          grossMinor: gross,
          taxMinor: tax,
          currency,
        });
        await tx.participation.update({
          where: { id: p.id },
          data: { state: "APPROVED", rowVersion: { increment: 1 } },
        });
      } else {
        await tx.participation.update({
          where: { id: p.id },
          data: {
            state: "REJECTED",
            fixDeadlineAt: new Date(Date.now() + FIX_SLA_HOURS * 3600_000),
            rowVersion: { increment: 1 },
          },
        });
      }

      // Vết audit ghi TRONG cùng transaction claim: duyệt/từ chối luôn kèm "ai quyết, lúc nào".
      await this.audit.record(tx, {
        actorUserId: auth.user.id,
        countryId: country.id,
        action: decision === "APPROVE" ? "CONTENT_APPROVED" : "CONTENT_REJECTED",
        targetType: "submission",
        targetId: submissionId,
        metadata: decision === "REJECT" ? { reason: reason?.trim() ?? null } : {},
      });

      return (await tx.submission.findFirst({ where: { id: submissionId } })) as SubmissionRow;
    });

    return this.toDto(updated);
  }
}
