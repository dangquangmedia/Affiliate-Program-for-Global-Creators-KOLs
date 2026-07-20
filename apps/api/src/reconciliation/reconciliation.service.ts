import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, PrismaClientLike } from "../prisma.service";
import { AuthContext } from "../auth/auth.service";
import { assertStaffForCountry } from "../auth/rbac";

// Đối soát là việc của Local Finance (V12). Admin không kiêm — tách vai rõ.
const FINANCE_ROLES = ["LOCAL_FINANCE"];

export interface ReconLineDto {
  id: string;
  earningId: string;
  creatorName: string;
  campaignTitle: string | null;
  netMinor: number;
  currency: string;
  anomaly: string | null;
}
export interface ReconBatchDto {
  id: string;
  period: string;
  status: string; // OPEN | LOCKED
  lockedAt: string | null;
  lineCount: number;
  totalNetMinor: number; // tổng net các dòng HỢP LỆ (loại anomaly)
  currency: string | null;
  lines?: ReconLineDto[];
}

type CountryRow = { id: string; enabled: boolean; currencyCode: string };
type EarningRow = {
  id: string;
  grossMinor: bigint;
  taxMinor: bigint;
  currency: string;
  profile?: { user: { displayName: string } };
  participation?: { campaign?: { title: string } };
};
type LineRow = {
  id: string;
  earningId: string;
  netMinor: bigint;
  currency: string;
  anomaly: string | null;
  earning?: EarningRow;
};
type BatchRow = {
  id: string;
  period: string;
  status: string;
  lockedAt: Date | null;
  lines?: LineRow[];
};

@Injectable()
export class ReconciliationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private conflict(code: string, message: string): never {
    throw new ConflictException({ code, message });
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

  private toLineDto(l: LineRow): ReconLineDto {
    return {
      id: l.id,
      earningId: l.earningId,
      creatorName: l.earning?.profile?.user.displayName ?? "—",
      campaignTitle: l.earning?.participation?.campaign?.title ?? null,
      netMinor: Number(l.netMinor),
      currency: l.currency,
      anomaly: l.anomaly,
    };
  }

  private toBatchDto(b: BatchRow, withLines = false): ReconBatchDto {
    const lines = b.lines ?? [];
    const total = lines.filter((l) => !l.anomaly).reduce((s, l) => s + l.netMinor, 0n);
    return {
      id: b.id,
      period: b.period,
      status: b.status,
      lockedAt: b.lockedAt ? b.lockedAt.toISOString() : null,
      lineCount: lines.length,
      totalNetMinor: Number(total),
      currency: lines.length ? lines[0].currency : null,
      ...(withLines ? { lines: lines.map((l) => this.toLineDto(l)) } : {}),
    };
  }

  /** Danh sách batch đối soát của nước Finance (mới nhất trước). */
  async listBatches(auth: AuthContext, market: string): Promise<ReconBatchDto[]> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);
    const rows = (await this.prisma.db.reconciliationBatch.findMany({
      where: { countryId: country.id },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    })) as BatchRow[];
    return rows.map((b) => this.toBatchDto(b));
  }

  /** Chi tiết 1 batch + các dòng (cách ly: batch phải thuộc nước Finance → 404). */
  async getBatch(auth: AuthContext, market: string, batchId: string): Promise<ReconBatchDto> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);
    const b = (await this.prisma.db.reconciliationBatch.findFirst({
      where: { id: batchId, countryId: country.id },
      include: {
        lines: {
          include: { earning: { include: { profile: { include: { user: true } }, participation: { include: { campaign: true } } } } },
          orderBy: { createdAt: "asc" },
        },
      },
    })) as BatchRow | null;
    if (!b) throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "Batch not found in this country." });
    return this.toBatchDto(b, true);
  }

  /**
   * Finance tạo batch: gom mọi earning PENDING của nước CHƯA nằm trong batch nào → 1 dòng/earning.
   * `ReconciliationLine.earning_id` UNIQUE là chốt chặn: 1 earning không vào 2 batch (dù 2 Finance
   * bấm tạo cùng lúc — người thứ 2 đụng unique). Không có earning nào chờ → 409 để khỏi tạo batch rỗng.
   */
  async createBatch(auth: AuthContext, market: string, period: string): Promise<ReconBatchDto> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);

    const pending = (await this.prisma.db.earning.findMany({
      where: { countryId: country.id, status: "PENDING", reconLine: { is: null } },
      include: { profile: { include: { user: true } }, participation: { include: { campaign: true } } },
      orderBy: { createdAt: "asc" },
    })) as EarningRow[];
    if (pending.length === 0) {
      this.conflict("NOTHING_TO_RECONCILE", "No PENDING earnings to reconcile for this country.");
    }

    const created = await this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
      const batch = (await tx.reconciliationBatch.create({
        data: { countryId: country.id, period: period.trim() || defaultPeriod(), status: "OPEN" },
      })) as { id: string };
      for (const e of pending) {
        await tx.reconciliationLine.create({
          data: {
            batchId: batch.id,
            earningId: e.id, // UNIQUE -> 1 earning đúng 1 batch
            netMinor: e.grossMinor - e.taxMinor,
            currency: e.currency,
            anomaly: null, // Phase 1 chưa gắn cờ bất thường tự động (cơ chế đã có cột)
          },
        });
      }
      return batch.id;
    });

    return this.getBatch(auth, market, created);
  }

  /**
   * Khoá batch (OPEN→LOCKED): claim bằng UPDATE có điều kiện (double-lock → 409). LOCKED = BẤT
   * BIẾN. Trong CÙNG transaction: mọi earning của dòng HỢP LỆ (không anomaly) PENDING→AVAILABLE
   * (mở tiền rút — N14). Không ghi bút toán sổ cái: PENDING→AVAILABLE là cổng quy trình, không
   * phải chuyển tiền (net đã accrue vào sổ lúc duyệt — N12); sổ cái chỉ ghi SỰ KIỆN tiền.
   */
  async lockBatch(auth: AuthContext, market: string, batchId: string): Promise<ReconBatchDto> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, FINANCE_ROLES);

    const batch = (await this.prisma.db.reconciliationBatch.findFirst({
      where: { id: batchId, countryId: country.id },
      include: { lines: true },
    })) as BatchRow | null;
    if (!batch) throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "Batch not found in this country." });

    await this.prisma.db.$transaction(async (tx: PrismaClientLike) => {
      const claimed = (await tx.$queryRaw`
        UPDATE reconciliation_batch
        SET status = 'LOCKED'::"BatchStatus", locked_by = ${auth.user.id}::uuid, locked_at = now()
        WHERE id = ${batchId}::uuid AND status = 'OPEN'
        RETURNING id
      `) as Array<{ id: string }>;
      if (claimed.length === 0) {
        this.conflict("BATCH_ALREADY_LOCKED", "This batch is already locked (immutable).");
      }
      // Dòng hợp lệ -> earning AVAILABLE (tiền rút được). Dòng anomaly để nguyên PENDING.
      for (const l of batch.lines ?? []) {
        if (l.anomaly) continue;
        await tx.earning.update({ where: { id: l.earningId }, data: { status: "AVAILABLE" } });
      }
    });

    return this.getBatch(auth, market, batchId);
  }
}

function defaultPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
