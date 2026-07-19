import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

// Ngữ cảnh 1 nước mà creator đang thao tác — suy từ DB, KHÔNG từ client.
export interface CountryContext {
  market: string;
  countryName: string;
  currency: string;
  currencyExponent: number;
  locale: string;
  fallbackLocale: string;
}
export interface MyCountryProfile {
  profileId: string;
  onboardingState: string;
  context: CountryContext;
}

type CountryRow = {
  id: string;
  code: string;
  name: string;
  currencyCode: string;
  currencyExponent: number;
  locale: string;
  fallbackLocale: string;
  enabled: boolean;
};
type ProfileWithCountry = {
  id: string;
  onboardingState: string;
  country: CountryRow;
};

@Injectable()
export class ProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toContext(c: CountryRow): CountryContext {
    return {
      market: c.code,
      countryName: c.name,
      currency: c.currencyCode,
      currencyExponent: c.currencyExponent,
      locale: c.locale,
      fallbackLocale: c.fallbackLocale,
    };
  }

  private async requireCountry(market: string): Promise<CountryRow> {
    const code = market.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: `"${market}" is not a market.` });
    }
    const country = (await this.prisma.db.country.findUnique({ where: { code } })) as CountryRow | null;
    if (!country || !country.enabled) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: `Market "${code}" is not available.` });
    }
    return country;
  }

  /**
   * Creator chọn 1 nước -> tạo (hoặc lấy lại) hồ sơ RIÊNG nước đó, gắn với user của PHIÊN.
   * Idempotent nhờ UNIQUE(user_id, country_id): chọn lại không tạo hồ sơ thứ 2, không trộn
   * dữ liệu 2 nước (bài toán khó #1). userId LẤY TỪ SESSION, không nhận từ client.
   */
  async selectCountry(userId: string, market: string): Promise<MyCountryProfile> {
    const country = await this.requireCountry(market);
    const profile = await this.prisma.db.creatorCountryProfile.upsert({
      where: { userId_countryId: { userId, countryId: country.id } },
      create: { userId, countryId: country.id },
      update: {},
    });
    return { profileId: profile.id, onboardingState: profile.onboardingState, context: this.toContext(country) };
  }

  /** Các nước creator đã có hồ sơ — chỉ của chính user phiên. */
  async listMyCountries(userId: string): Promise<MyCountryProfile[]> {
    const rows = (await this.prisma.db.creatorCountryProfile.findMany({
      where: { userId },
      include: { country: true },
    })) as ProfileWithCountry[];
    return rows.map((r) => ({
      profileId: r.id,
      onboardingState: r.onboardingState,
      context: this.toContext(r.country),
    }));
  }
}
