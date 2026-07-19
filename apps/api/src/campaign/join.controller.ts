import { Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { JoinService, ParticipationDto } from "./join.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

// Join/leave/my-campaigns: đều cần phiên; userId lấy từ session.
@Controller()
@UseGuards(SessionAuthGuard)
export class JoinController {
  constructor(@Inject(JoinService) private readonly join: JoinService) {}

  @Post("markets/:market/campaigns/:id/join")
  joinCampaign(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("id") id: string,
  ): Promise<ParticipationDto> {
    return this.join.join(auth.user.id, market, id);
  }

  @Post("markets/:market/campaigns/:id/leave")
  leaveCampaign(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("id") id: string,
  ): Promise<ParticipationDto> {
    return this.join.leave(auth.user.id, market, id);
  }

  @Get("me/country/:market/participations")
  mine(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<ParticipationDto[]> {
    return this.join.listMine(auth.user.id, market);
  }
}
