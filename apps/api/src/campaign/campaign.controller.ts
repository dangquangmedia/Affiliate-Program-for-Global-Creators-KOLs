import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { CampaignService, CampaignSummary, CampaignDetail, CreateCampaignInput } from "./campaign.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

interface CreateBody {
  title?: unknown;
  brand?: unknown;
  platform?: unknown;
  requiredHashtag?: unknown;
  brief?: unknown;
  rewardMinor?: unknown;
  slotsTotal?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : Number.NaN);

// Discover/detail cần đăng nhập (creator); tạo campaign cần vai LOCAL_ADMIN (kiểm trong service).
@Controller("markets/:market/campaigns")
@UseGuards(SessionAuthGuard)
export class CampaignController {
  constructor(@Inject(CampaignService) private readonly campaigns: CampaignService) {}

  @Get()
  list(@Param("market") market: string): Promise<CampaignSummary[]> {
    return this.campaigns.listForMarket(market);
  }

  @Get(":id")
  detail(@Param("market") market: string, @Param("id") id: string): Promise<CampaignDetail> {
    return this.campaigns.getForMarket(market, id);
  }

  // Gợi ý campaign tương tự (dùng khi hết suất / đang chờ) — QĐ-5.
  @Get(":id/similar")
  similar(@Param("market") market: string, @Param("id") id: string): Promise<CampaignSummary[]> {
    return this.campaigns.suggestSimilar(market, id);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Body() body: CreateBody,
  ): Promise<CampaignDetail> {
    const input: CreateCampaignInput = {
      title: str(body.title),
      brand: str(body.brand),
      platform: str(body.platform),
      requiredHashtag: str(body.requiredHashtag),
      brief: str(body.brief),
      rewardMinor: num(body.rewardMinor),
      slotsTotal: num(body.slotsTotal),
    };
    return this.campaigns.create(auth, market, input);
  }
}
