import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AppController } from "./app.controller";
import { HealthController } from "./health.controller";
import { MarketsController } from "./markets.controller";
import { MarketsService } from "./markets.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { SessionAuthGuard } from "./auth/session-auth.guard";

@Module({
  controllers: [AppController, HealthController, MarketsController, AuthController],
  providers: [PrismaService, MarketsService, AuthService, SessionAuthGuard],
})
export class AppModule {}
