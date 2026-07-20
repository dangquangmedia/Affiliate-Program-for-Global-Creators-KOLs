import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { LedgerService, LedgerView } from "../ledger/ledger.service";

// Vòng đời thu nhập creator phải hiểu được không cần giải thích:
// PENDING (chờ đối soát) → AVAILABLE (rút được) → PAID (đã trả). REVERSED = đã đảo.
export interface EarningDto {
  id: string;
  campaignTitle: string | null;
  grossMinor: number;
  taxMinor: number;
  netMinor: number; // = gross − tax, TÍNH LẠI (không lưu rời — bài toán #2)
  currency: string;
  status: string;
  createdAt: string;
}
export interface EarningsSummary {
  currency: string | null;
  totalGrossMinor: number;
  totalTaxMinor: number;
  totalNetMinor: number;
  // Net theo từng trạng thái — để creator thấy "bao nhiêu đang chờ / rút được / đã trả".
  pendingNetMinor: number;
  availableNetMinor: number;
  paidNetMinor: number;
}
export interface EarningsDashboard {
  earnings: EarningDto[]; // mới nhất trước
  summary: EarningsSummary;
  ledger: LedgerView; // sổ cái append-only — nguồn sự thật về số dư (bài toán #6)
}

type CountryRow = { id: string; enabled: boolean };
type EarningRow = {
  id: string;
  grossMinor: bigint;
  taxMinor: bigint;
  currency: string;
  status: string;
  createdAt: Date;
  participation?: { campaign?: { title: string } };
};

@Injectable()
export class EarningsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
  ) {}

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

  private async ensureProfileId(userId: string, countryId: string): Promise<string> {
    const p = await this.prisma.db.creatorCountryProfile.upsert({
      where: { userId_countryId: { userId, countryId } },
      create: { userId, countryId },
      update: {},
    });
    return p.id;
  }

  /** Dashboard V07: thu nhập của creator trong 1 nước + tổng Gross–Thuế–Net + sổ cái. */
  async dashboard(userId: string, market: string): Promise<EarningsDashboard> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);

    const rows = (await this.prisma.db.earning.findMany({
      where: { profileId, countryId: country.id },
      include: { participation: { include: { campaign: true } } },
      orderBy: { createdAt: "desc" },
    })) as EarningRow[];

    const earnings: EarningDto[] = rows.map((e) => ({
      id: e.id,
      campaignTitle: e.participation?.campaign?.title ?? null,
      grossMinor: Number(e.grossMinor),
      taxMinor: Number(e.taxMinor),
      netMinor: Number(e.grossMinor - e.taxMinor),
      currency: e.currency,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    }));

    let gross = 0n;
    let tax = 0n;
    const netByStatus: Record<string, bigint> = { PENDING: 0n, AVAILABLE: 0n, PAID: 0n };
    for (const e of rows) {
      gross += e.grossMinor;
      tax += e.taxMinor;
      const net = e.grossMinor - e.taxMinor;
      if (e.status in netByStatus) netByStatus[e.status] += net;
    }

    const summary: EarningsSummary = {
      currency: rows.length ? rows[0].currency : null,
      totalGrossMinor: Number(gross),
      totalTaxMinor: Number(tax),
      totalNetMinor: Number(gross - tax),
      pendingNetMinor: Number(netByStatus.PENDING),
      availableNetMinor: Number(netByStatus.AVAILABLE),
      paidNetMinor: Number(netByStatus.PAID),
    };

    const ledger = await this.ledger.view(profileId, country.id);
    return { earnings, summary, ledger };
  }
}
