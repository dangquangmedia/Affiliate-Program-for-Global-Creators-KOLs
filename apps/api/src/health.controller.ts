import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Controller("health")
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: "ok"; db: "up" }> {
    try {
      await this.prisma.db.$queryRaw`SELECT 1`;
      return { status: "ok", db: "up" };
    } catch {
      throw new ServiceUnavailableException({ status: "error", db: "down" });
    }
  }
}
