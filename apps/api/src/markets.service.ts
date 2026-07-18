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

// Schema lean N5: locale/fallbackLocale nằm trên country; config 1:1 (không versioned list).
type CountryWithConfig = {
  code: string;
  name: string;
  currencyCode: string;
  currencyExponent: number;
  locale: string;
  fallbackLocale: string;
  enabled: boolean;
  config: { configVersion: number } | null;
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
      include: { config: true },
    })) as CountryWithConfig | null;

    if (!country) {
      throw new NotFoundException({
        code: "RESOURCE_NOT_FOUND",
        message: `"${marketParam}" is not a recognized market.`,
      });
    }

    if (!country.config) {
      throw new NotFoundException({
        code: "RESOURCE_NOT_FOUND",
        message: `Market "${code}" has no country configuration.`,
      });
    }

    return {
      market: country.code,
      countryName: country.name,
      locale: country.locale,
      fallbackLocale: country.fallbackLocale,
      currency: country.currencyCode,
      currencyExponent: country.currencyExponent,
      configVersion: country.config.configVersion,
      enabled: country.enabled,
    };
  }
}
