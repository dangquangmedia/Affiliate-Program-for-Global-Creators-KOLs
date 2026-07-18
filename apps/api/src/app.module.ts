import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AppController } from "./app.controller";
import { HealthController } from "./health.controller";
import { MarketsController } from "./markets.controller";
import { MarketsService } from "./markets.service";

@Module({
  controllers: [AppController, HealthController, MarketsController],
  providers: [PrismaService, MarketsService],
})
export class AppModule {}
