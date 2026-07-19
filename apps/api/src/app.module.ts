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

@Module({
  controllers: [AppController, HealthController, MarketsController, AuthController, ProfileController],
  providers: [PrismaService, MarketsService, AuthService, SessionAuthGuard, ProfileService],
})
export class AppModule {}
