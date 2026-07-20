import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, PrismaClientLike } from "../prisma.service";
import { AuthContext } from "../auth/auth.service";
import { assertStaffForCountry } from "../auth/rbac";
import { LedgerService } from "../ledger/ledger.service";

const FINANCE_ROLES = ["LOCAL_FINANCE"];
const OTP_TTL_MINUTES = 10;
// Payout đang "giữ tiền" (đã reserve) — trừ khỏi số dư rút được. FAILED_RELEASED đã hoàn nên không trừ.
const OUTSTANDING_STATES = new Set(["PROCESSING", "PAID", "UNKNOWN_HOLD"]);

export interface PayoutDto {
  id: string;
  amountMinor: number;
  currency: string;
  state: string; // PROCESSING | PAID | FAILED_RELEASED | UNKNOWN_HOLD
  requestedAt: string;
}
export interface OtpDto {
  otpId: string;
  code: string; // CHỈ mock/dev: OTP thật gửi qua SMS. Ở đây trả về để hiện màn dev.
  expiresAt: string;
}
export interface WalletDto {
  withdrawableMinor: number; // = net AVAILABLE − các lệnh đang giữ tiền
  minPayoutMinor: number;
  currency: string;
  payouts: PayoutDto[]; // lịch sử, mới nhất trước
}
export interface PayoutQueueItem extends PayoutDto {
  creatorName: string;
}

// Kết cục provider mock. Lần gọi đầu (từ PROCESSING) có thể UNKNOWN; giải quyết tay (từ
// UNKNOWN_HOLD) chỉ còn 2 ngả dứt điểm.
export type SettleResult = "SUCCESS" | "FAIL" | "UNKNOWN";
export type ResolveResult = "SUCCESS" | "FAIL";

type CountryRow = { id: string; enabled: boolean; currencyCode: string };
type EarningLite = { grossMinor: bigint; taxMinor: bigint };
type PayoutRow = {
  id: string;
  amountMinor: bigint;
  currency: string;
  state: string;
  requestedAt: Date;
  profileId: string;
  countryId: string;
  profile?: { user: { displayName: string } };
};
type OtpRow = { id: string; code: string; consumedAt: Date | null; expiresAt: Date };

@Injectable()
export class PayoutService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
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

  private toDto(p: PayoutRow): PayoutDto {
    return {
      id: p.id,
      amountMinor: Number(p.amountMinor),
      currency: p.currency,
      state: p.state,
      requestedAt: p.requestedAt.toISOString(),
    };
  }

  /**
   * Số tiền rút được = Σ net earning AVAILABLE − Σ tiền các lệnh đang giữ (PROCESSING/PAID/
   * UNKNOWN_HOLD). Tính bằng client truyền vào (this.prisma.db khi đọc; tx khi tạo lệnh — chặn
   * rút vượt số dư ngay trong khóa transaction).
   */
  private async withdrawable(db: PrismaClientLike, profileId: string, countryId: string): Promise<bigint> {
    const avail = (await db.earning.findMany({
      where: { profileId, countryId, status: "AVAILABLE" },
    })) as EarningLite[];
    let net = 0n;
    for (const e of avail) net += e.grossMinor - e.taxMinor;

    const payouts = (await db.payoutRequest.findMany({ where: { profileId, countryId } })) as PayoutRow[];
    let held = 0n;
    for (const p of payouts) if (OUTSTANDING_STATES.has(p.state)) held += p.amountMinor;

    return net - held;
  }

  /** Số dư ví + tối thiểu rút + lịch sử lệnh (V08). */
  async wallet(userId: string, market: string): Promise<WalletDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);
    const config = (await this.prisma.db.countryConfig.findUnique({ where: { countryId: country.id } })) as
      | { minPayoutMinor: bigint }
      | null;
    const payouts = (await this.prisma.db.payoutRequest.findMany({
      where: { profileId, countryId: country.id },
      orderBy: { requestedAt: "desc" },
    })) as PayoutRow[];
    return {
      withdrawableMinor: Number(await this.withdrawable(this.prisma.db, profileId, country.id)),
      minPayoutMinor: Number(config?.minPayoutMinor ?? 0n),
      currency: country.currencyCode,
      payouts: payouts.map((p) => this.toDto(p)),
    };
  }

  /** Phát OTP mock cho rút tiền. Trả về code (chỉ dev) để hiện màn — thật thì gửi SMS. */
  async requestOtp(userId: string, market: string): Promise<OtpDto> {
    const country = await this.requireCountry(market);
    await this.ensureProfileId(userId, country.id);
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 chữ số
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    const otp = (await this.prisma.db.otpCode.create({
      data: { userId, purpose: "PAYOUT", code, expiresAt },
    })) as { id: string };
    return { otpId: otp.id, code, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Tạo lệnh rút. Chống bấm 2 lần: `idempotency_key` UNIQUE — key đã có → trả lệnh cũ (không tạo
   * 2 lệnh, không reserve 2 lần). OTP: đúng mã + chưa dùng + chưa hết hạn, consume nguyên tử. Số
   * dư kiểm + reserve (ghi sổ PAYOUT_RESERVE −amount) TRONG cùng transaction để không rút vượt.
   */
  async createPayout(
    userId: string,
    market: string,
    amountMinor: number,
    otpId: string,
    code: string,
    idempotencyKey: string,
  ): Promise<PayoutDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);

    if (!idempotencyKey?.trim()) this.badRequest("idempotencyKey is required.");
    const dup = (await this.prisma.db.payoutRequest.findFirst({
      where: { idempotencyKey, profileId },
    })) as PayoutRow | null;
    if (dup) return this.toDto(dup); // idempotent: trả lệnh đã tạo

    if (!Number.isInteger(amountMinor) || amountMinor <= 0) this.badRequest("amountMinor must be a positive integer.");
    const config = (await this.prisma.db.countryConfig.findUnique({ where: { countryId: country.id } })) as
      | { minPayoutMinor: bigint }
      | null;
    const min = config?.minPayoutMinor ?? 0n;
    if (BigInt(amountMinor) < min) {
      this.conflict("BELOW_MIN_PAYOUT", `Minimum payout is ${min} (minor units).`);
    }

    const otp = (await this.prisma.db.otpCode.findFirst({
      where: { id: otpId, userId, purpose: "PAYOUT" },
    })) as OtpRow | null;
    if (!otp || otp.code !== code) this.conflict("OTP_INVALID", "OTP code is invalid.");
    if (otp.consumedAt) this.conflict("OTP_USED", "OTP has already been used.");
    if (otp.expiresAt.getTime() < Date.now()) this.conflict("OTP_EXPIRED", "OTP has expired.");

    try {
      return await this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
        // Consume OTP nguyên tử (chống dùng lại khi 2 request song song).
        const consumed = (await tx.$queryRaw`
          UPDATE otp_code SET consumed_at = now() WHERE id = ${otpId}::uuid AND consumed_at IS NULL RETURNING id
        `) as Array<{ id: string }>;
        if (consumed.length === 0) this.conflict("OTP_USED", "OTP has already been used.");

        // Kiểm số dư TRONG khóa: không rút vượt kể cả 2 lệnh song song.
        const bal = await this.withdrawable(tx, profileId, country.id);
        if (BigInt(amountMinor) > bal) {
          this.conflict("INSUFFICIENT_BALANCE", "Amount exceeds withdrawable balance.");
        }

        const payout = (await tx.payoutRequest.create({
          data: {
            countryId: country.id,
            profileId,
            amountMinor: BigInt(amountMinor),
            currency: country.currencyCode,
            state: "PROCESSING",
            otpId,
            idempotencyKey,
          },
        })) as PayoutRow;

        // Reserve: giữ tiền khỏi số dư (ghi sổ append-only −amount).
        await this.ledger.post(tx, {
          countryId: country.id,
          profileId,
          entryType: "PAYOUT_RESERVE",
          amountMinor: -BigInt(amountMinor),
          currency: country.currencyCode,
          refType: "payout",
          refId: payout.id,
        });

        return this.toDto(payout);
      });
    } catch (e) {
      // Đua idempotency: 2 request cùng key -> UNIQUE chặn -> trả lệnh đã tạo.
      if ((e as { code?: string }).code === "P2002") {
        const existing = (await this.prisma.db.payoutRequest.findFirst({
          where: { idempotencyKey, profileId },
        })) as PayoutRow | null;
        if (existing) return this.toDto(existing);
      }
      throw e;
    }
  }

  /** Finance: hàng đợi lệnh đang chờ xử lý (PROCESSING) của nước mình. */
  async queue(auth: AuthContext, market: string): Promise<PayoutQueueItem[]> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);
    const rows = (await this.prisma.db.payoutRequest.findMany({
      where: { countryId: country.id, state: "PROCESSING" },
      include: { profile: { include: { user: true } } },
      orderBy: { requestedAt: "asc" },
    })) as PayoutRow[];
    return rows.map((p) => ({ ...this.toDto(p), creatorName: p.profile?.user.displayName ?? "—" }));
  }

  /** Finance: lệnh đang UNKNOWN_HOLD (kết cục không rõ) chờ đối soát tay của nước mình (N15). */
  async holds(auth: AuthContext, market: string): Promise<PayoutQueueItem[]> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);
    const rows = (await this.prisma.db.payoutRequest.findMany({
      where: { countryId: country.id, state: "UNKNOWN_HOLD" },
      include: { profile: { include: { user: true } } },
      orderBy: { requestedAt: "asc" },
    })) as PayoutRow[];
    return rows.map((p) => ({ ...this.toDto(p), creatorName: p.profile?.user.displayName ?? "—" }));
  }

  /**
   * Finance "gọi provider mock" và ghi kết cục cho lệnh PROCESSING (bài toán #4 — 3 kết cục):
   *  - SUCCESS → PAID: reserve đã trừ tiền nên số dư không đổi.
   *  - FAIL (xác nhận provider KHÔNG chuyển) → FAILED_RELEASED + **hoàn tiền đúng 1 lần**
   *    (`PAYOUT_RELEASE +amount`); creator muốn rút lại phải tạo lệnh MỚI.
   *  - UNKNOWN (timeout/không rõ) → UNKNOWN_HOLD: **KHÔNG hoàn** — hoàn vội = double-pay nếu
   *    provider thật ra đã chuyển; giữ reserve chờ Finance đối soát tay (`resolveHold`).
   */
  async settle(auth: AuthContext, market: string, payoutId: string, result: SettleResult): Promise<PayoutDto> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);
    if (result !== "SUCCESS" && result !== "FAIL" && result !== "UNKNOWN") {
      this.badRequest('result must be "SUCCESS" | "FAIL" | "UNKNOWN".');
    }
    const payout = await this.findInCountry(payoutId, country.id);
    return this.prisma.db.$transaction((tx: PrismaClientLike) =>
      this.applyProviderOutcome(tx, payout, "PROCESSING", result, "ALREADY_SETTLED", "This payout has already been settled."),
    );
  }

  /**
   * Đối soát tay 1 lệnh đang UNKNOWN_HOLD — sau khi Finance kiểm chứng với provider thật:
   *  - SUCCESS (provider ĐÃ chuyển) → PAID, giữ nguyên reserve (không hoàn).
   *  - FAIL (provider KHÔNG chuyển) → FAILED_RELEASED + hoàn tiền đúng 1 lần.
   * Không nhận UNKNOWN nữa: đây là bước kết luận dứt điểm.
   */
  async resolveHold(auth: AuthContext, market: string, payoutId: string, result: ResolveResult): Promise<PayoutDto> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);
    if (result !== "SUCCESS" && result !== "FAIL") this.badRequest('result must be "SUCCESS" | "FAIL".');
    const payout = await this.findInCountry(payoutId, country.id);
    return this.prisma.db.$transaction((tx: PrismaClientLike) =>
      this.applyProviderOutcome(tx, payout, "UNKNOWN_HOLD", result, "NOT_ON_HOLD", "This payout is not awaiting manual resolution."),
    );
  }

  private async findInCountry(payoutId: string, countryId: string): Promise<PayoutRow> {
    const payout = (await this.prisma.db.payoutRequest.findFirst({
      where: { id: payoutId, countryId },
    })) as PayoutRow | null;
    if (!payout) this.notFound("Payout not found in this country.");
    return payout;
  }

  /**
   * Ghi kết cục provider trong 1 transaction. **Claim** `WHERE state=fromState` — kẻ đến sau match
   * 0 hàng → 409 (chống xử lý 2 lần). Mỗi lần gọi provider = 1 `payout_attempt` với `provider_ref`
   * KHÁC NHAU (`mock-{id}-{lần}`) để callback/retry idempotent (UNIQUE provider_ref). FAIL hoàn
   * tiền `PAYOUT_RELEASE +amount` — claim + `UNIQUE(ref_type,ref_id,entry_type)` cùng đảm bảo hoàn
   * đúng 1 lần.
   */
  private async applyProviderOutcome(
    tx: PrismaClientLike,
    payout: PayoutRow,
    fromState: string,
    result: SettleResult,
    conflictCode: string,
    conflictMsg: string,
  ): Promise<PayoutDto> {
    const toState = result === "SUCCESS" ? "PAID" : result === "FAIL" ? "FAILED_RELEASED" : "UNKNOWN_HOLD";
    const claimed = (await tx.$queryRaw`
      UPDATE payout_request SET state = ${toState}::"PayoutState"
      WHERE id = ${payout.id}::uuid AND state = ${fromState}::"PayoutState" RETURNING id
    `) as Array<{ id: string }>;
    if (claimed.length === 0) this.conflict(conflictCode, conflictMsg);

    const prior = (await tx.payoutAttempt.findMany({ where: { payoutRequestId: payout.id } })) as unknown[];
    const attemptNo = prior.length + 1; // provider_ref khác nhau mỗi lần thử
    await tx.payoutAttempt.create({
      data: {
        payoutRequestId: payout.id,
        providerRef: `mock-${payout.id}-${attemptNo}`,
        result,
        raw: `mock provider ${result.toLowerCase()}`,
      },
    });

    if (result === "FAIL") {
      // Hoàn tiền về số dư: ghi sổ +amount. FAILED_RELEASED rời khỏi tập "đang giữ" nên số dư rút
      // được tự phục hồi (withdrawable = net AVAILABLE − Σ lệnh đang giữ).
      await this.ledger.post(tx, {
        countryId: payout.countryId,
        profileId: payout.profileId,
        entryType: "PAYOUT_RELEASE",
        amountMinor: payout.amountMinor,
        currency: payout.currency,
        refType: "payout",
        refId: payout.id,
      });
    }
    return this.toDto({ ...payout, state: toState });
  }
}
