import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ReconciliationService, ReconBatchDto } from "./reconciliation.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

interface CreateBody {
  period?: unknown;
}
const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Local Finance: đối soát nước mình (RBAC + cách ly trong service) (V12).
@Controller("ops/:market/reconciliation")
@UseGuards(SessionAuthGuard)
export class ReconciliationController {
  constructor(@Inject(ReconciliationService) private readonly recon: ReconciliationService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<ReconBatchDto[]> {
    return this.recon.listBatches(auth, market);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Body() body: CreateBody,
  ): Promise<ReconBatchDto> {
    return this.recon.createBatch(auth, market, str(body.period));
  }

  @Get(":batchId")
  detail(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("batchId") batchId: string,
  ): Promise<ReconBatchDto> {
    return this.recon.getBatch(auth, market, batchId);
  }

  @Post(":batchId/lock")
  lock(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("batchId") batchId: string,
  ): Promise<ReconBatchDto> {
    return this.recon.lockBatch(auth, market, batchId);
  }
}
