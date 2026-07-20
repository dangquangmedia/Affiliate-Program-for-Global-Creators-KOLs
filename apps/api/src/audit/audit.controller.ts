import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { AuditService, AuditEventDto } from "./audit.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

// Global Admin xem nhật ký audit toàn cục (AD-02). Lọc theo ?market=vn|ph (tuỳ chọn).
@Controller("admin/audit")
@UseGuards(SessionAuthGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query("market") market?: string): Promise<AuditEventDto[]> {
    return this.audit.list(auth, market);
  }
}
