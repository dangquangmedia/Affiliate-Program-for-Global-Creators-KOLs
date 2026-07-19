import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AppController } from "./app.controller";
import { HealthController } from "./health.controller";
import { MarketsController } from "./markets.controller";
import { MarketsService } from "./markets.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { ProfileController } from "./country/profile.controller";
import { ProfileService } from "./country/profile.service";
import { CreatorKycController, OpsKycController } from "./kyc/kyc.controller";
import { KycService } from "./kyc/kyc.service";
import { CampaignController } from "./campaign/campaign.controller";
import { CampaignService } from "./campaign/campaign.service";
import { JoinController } from "./campaign/join.controller";
import { JoinService } from "./campaign/join.service";
import { ReclaimScheduler } from "./campaign/reclaim.scheduler";

@Module({
  controllers: [
    AppController,
    HealthController,
    MarketsController,
    AuthController,
    ProfileController,
    CreatorKycController,
    OpsKycController,
    CampaignController,
    JoinController,
  ],
  providers: [
    PrismaService,
    MarketsService,
    AuthService,
    SessionAuthGuard,
    ProfileService,
    KycService,
    CampaignService,
    JoinService,
    ReclaimScheduler,
  ],
})
export class AppModule {}
