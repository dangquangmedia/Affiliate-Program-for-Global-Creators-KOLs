import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { EarningsService, EarningsDashboard } from "./earnings.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

// Creator: dashboard thu nhập + sổ cái của CHÍNH PHIÊN cho 1 nước (V07).
@Controller("me/country/:market/earnings")
@UseGuards(SessionAuthGuard)
export class EarningsController {
  constructor(@Inject(EarningsService) private readonly earnings: EarningsService) {}

  @Get()
  dashboard(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<EarningsDashboard> {
    return this.earnings.dashboard(auth.user.id, market);
  }
}
