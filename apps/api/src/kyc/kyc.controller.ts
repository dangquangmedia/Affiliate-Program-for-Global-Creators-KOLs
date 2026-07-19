import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { KycService, KycCaseDto, KycQueueItem, FieldDecision } from "./kyc.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

interface SubmitBody {
  values?: Record<string, unknown>;
}
interface ReviewBody {
  decisions?: unknown;
}

function coerceValues(input: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function coerceDecisions(input: unknown): FieldDecision[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((d): FieldDecision[] => {
    if (typeof d !== "object" || d === null) return [];
    const key = (d as Record<string, unknown>).key;
    const decision = (d as Record<string, unknown>).decision;
    const reason = (d as Record<string, unknown>).reason;
    if (typeof key !== "string" || (decision !== "ACCEPT" && decision !== "NEEDS_CHANGES")) return [];
    return [{ key, decision, reason: typeof reason === "string" ? reason : undefined }];
  });
}

// Creator: KYC của chính phiên cho 1 nước.
@Controller("me/country/:market/kyc")
@UseGuards(SessionAuthGuard)
export class CreatorKycController {
  constructor(@Inject(KycService) private readonly kyc: KycService) {}

  @Get()
  get(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<KycCaseDto> {
    return this.kyc.getMyCase(auth.user.id, market);
  }

  @Post()
  submit(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Body() body: SubmitBody,
  ): Promise<KycCaseDto> {
    return this.kyc.submit(auth.user.id, market, coerceValues(body.values));
  }
}

// Ops: hàng đợi + duyệt KYC của nước mình (RBAC + cách ly trong service).
@Controller("ops/:market/kyc")
@UseGuards(SessionAuthGuard)
export class OpsKycController {
  constructor(@Inject(KycService) private readonly kyc: KycService) {}

  @Get("queue")
  queue(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<KycQueueItem[]> {
    return this.kyc.getQueue(auth, market);
  }

  @Post(":caseId/review")
  review(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("caseId") caseId: string,
    @Body() body: ReviewBody,
  ): Promise<KycCaseDto> {
    return this.kyc.review(auth, market, caseId, coerceDecisions(body.decisions));
  }
}
