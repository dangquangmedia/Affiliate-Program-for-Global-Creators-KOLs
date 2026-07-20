import { BadRequestException, Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { PayoutService, WalletDto, OtpDto, PayoutDto, PayoutQueueItem, SettleResult, ResolveResult } from "./payout.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

interface CreateBody {
  amountMinor?: unknown;
  otpId?: unknown;
  code?: unknown;
  idempotencyKey?: unknown;
}
interface SettleBody {
  result?: unknown;
}
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : Number.NaN);

// Creator: ví + rút tiền của CHÍNH PHIÊN cho 1 nước (V08).
@Controller("me/country/:market")
@UseGuards(SessionAuthGuard)
export class CreatorPayoutController {
  constructor(@Inject(PayoutService) private readonly payout: PayoutService) {}

  @Get("wallet")
  wallet(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<WalletDto> {
    return this.payout.wallet(auth.user.id, market);
  }

  @Post("payouts/otp")
  otp(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<OtpDto> {
    return this.payout.requestOtp(auth.user.id, market);
  }

  @Post("payouts")
  create(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Body() body: CreateBody,
  ): Promise<PayoutDto> {
    return this.payout.createPayout(auth.user.id, market, num(body.amountMinor), str(body.otpId), str(body.code), str(body.idempotencyKey));
  }
}

const SETTLE_RESULTS = new Set(["SUCCESS", "FAIL", "UNKNOWN"]);
const RESOLVE_RESULTS = new Set(["SUCCESS", "FAIL"]);

// Finance: hàng đợi payout + xử lý kết cục provider (V12).
@Controller("ops/:market/payouts")
@UseGuards(SessionAuthGuard)
export class FinancePayoutController {
  constructor(@Inject(PayoutService) private readonly payout: PayoutService) {}

  @Get()
  queue(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<PayoutQueueItem[]> {
    return this.payout.queue(auth, market);
  }

  // Lệnh đang UNKNOWN_HOLD chờ đối soát tay (N15).
  @Get("holds")
  holds(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<PayoutQueueItem[]> {
    return this.payout.holds(auth, market);
  }

  // Gọi provider mock lần đầu: SUCCESS → PAID, FAIL → hoàn tiền, UNKNOWN → giữ chờ đối soát.
  @Post(":id/settle")
  settle(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("id") id: string,
    @Body() body: SettleBody,
  ): Promise<PayoutDto> {
    if (typeof body.result !== "string" || !SETTLE_RESULTS.has(body.result)) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: 'result must be "SUCCESS" | "FAIL" | "UNKNOWN".' });
    }
    return this.payout.settle(auth, market, id, body.result as SettleResult);
  }

  // Kết luận dứt điểm 1 lệnh UNKNOWN_HOLD sau khi đối soát tay với provider (N15).
  @Post(":id/resolve")
  resolve(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("id") id: string,
    @Body() body: SettleBody,
  ): Promise<PayoutDto> {
    if (typeof body.result !== "string" || !RESOLVE_RESULTS.has(body.result)) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: 'result must be "SUCCESS" | "FAIL".' });
    }
    return this.payout.resolveHold(auth, market, id, body.result as ResolveResult);
  }
}
