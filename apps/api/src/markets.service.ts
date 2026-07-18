import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

export interface MarketContext {
  market: string;
  countryName: string;
  locale: string;
  fallbackLocale: string;
  currency: string;
  currencyExponent: number;
  configVersion: number;
  enabled: boolean;
}

type CountryWithActiveConfig = {
  code: string;
  name: string;
  currencyCode: string;
  currencyExponent: number;
  enabled: boolean;
  configs: Array<{ version: number; locale: string; fallbackLocale: string; active: boolean }>;
};

@Injectable()
export class MarketsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getContext(marketParam: string): Promise<MarketContext> {
    const code = marketParam.toUpperCase();

    if (!/^[A-Z]{2}$/.test(code)) {
      throw new NotFoundException({
        code: "RESOURCE_NOT_FOUND",
        message: `"${marketParam}" is not a recognized market.`,
      });
    }

    const country = (await this.prisma.db.country.findUnique({
      where: { code },
      include: { configs: { where: { active: true }, take: 1 } },
    })) as CountryWithActiveConfig | null;

    if (!country) {
      throw new NotFoundException({
        code: "RESOURCE_NOT_FOUND",
        message: `"${marketParam}" is not a recognized market.`,
      });
    }

    const activeConfig = country.configs[0];
    if (!activeConfig) {
      throw new NotFoundException({
        code: "RESOURCE_NOT_FOUND",
        message: `Market "${code}" has no active country configuration.`,
      });
    }

    return {
      market: country.code,
      countryName: country.name,
      locale: activeConfig.locale,
      fallbackLocale: activeConfig.fallbackLocale,
      currency: country.currencyCode,
      currencyExponent: country.currencyExponent,
      configVersion: activeConfig.version,
      enabled: country.enabled,
    };
  }
}
