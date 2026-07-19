import { Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ProfileService, MyCountryProfile } from "./profile.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

// Mọi route dưới đây bắt buộc có phiên hợp lệ; userId lấy từ session, không từ URL/body.
// Route `:market` chỉ là Ý ĐỊNH — quyền/hồ sơ vẫn cột vào user của phiên.
@Controller("me")
@UseGuards(SessionAuthGuard)
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profiles: ProfileService) {}

  @Get("countries")
  listMine(@CurrentAuth() auth: AuthContext): Promise<MyCountryProfile[]> {
    return this.profiles.listMyCountries(auth.user.id);
  }

  @Post("country/:market")
  select(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<MyCountryProfile> {
    return this.profiles.selectCountry(auth.user.id, market);
  }
}
