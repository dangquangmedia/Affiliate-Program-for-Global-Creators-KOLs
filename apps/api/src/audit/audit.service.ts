import { Inject, Injectable } from "@nestjs/common";
import { PrismaService, PrismaClientLike } from "../prisma.service";
import { AuthContext } from "../auth/auth.service";
import { assertGlobalAdmin } from "../auth/rbac";

/**
 * AuditService — nhật ký MỌI quyết định của staff (AD-02). Append-only như LedgerService: chỉ
 * CREATE, không UPDATE/DELETE. NGUYÊN TẮC (câu trả lời cho mentor): `record()` được gọi TRONG
 * CÙNG transaction với hành động (giống ledger) — không bao giờ có quyết định mà thiếu vết audit,
 * cũng không có vết audit cho một quyết định đã bị rollback. "Ai làm gì, với cái gì, ở nước nào,
 * lúc nào" luôn truy lại được.
 */

export type AuditAction =
  | "KYC_REVIEWED"
  | "CONTENT_APPROVED"
  | "CONTENT_REJECTED"
  | "RECON_BATCH_CREATED"
  | "RECON_BATCH_LOCKED"
  | "PAYOUT_SETTLED"
  | "PAYOUT_RESOLVED"
  | "CAMPAIGN_CREATED";

export interface AuditInput {
  actorUserId: string;
  countryId: string | null; // NULL = hành động toàn cục (hiếm); thường là nước của tài nguyên
  action: AuditAction;
  targetType: string; // 'kyc_case' | 'submission' | 'recon_batch' | 'payout' | 'campaign'
  targetId: string;
  metadata?: Record<string, unknown>; // ngữ cảnh quyết định (kết cục, lý do, số tiền...)
}

export interface AuditEventDto {
  id: string;
  actorName: string;
  action: string;
  countryCode: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
}

type CountryRow = { id: string; enabled: boolean };
type AuditRow = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: Date;
  actor?: { displayName: string };
  country?: { code: string } | null;
};

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Ghi 1 sự kiện audit TRONG transaction có sẵn (append-only). `client` là tx của hành động →
   * audit + hành động cùng commit hoặc cùng rollback. Không tự mở transaction riêng.
   */
  async record(client: PrismaClientLike, input: AuditInput): Promise<void> {
    await client.auditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        countryId: input.countryId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: (input.metadata ?? null) as unknown,
      },
    });
  }

  /**
   * Global Admin xem nhật ký (mới nhất trước), tuỳ chọn lọc theo nước. Chỉ GLOBAL_ADMIN — vai
   * duy nhất vượt biên giới — mới được đọc audit của mọi nước.
   */
  async list(auth: AuthContext, market?: string): Promise<AuditEventDto[]> {
    assertGlobalAdmin(auth);

    let countryId: string | undefined;
    if (market?.trim()) {
      const code = market.toUpperCase();
      const country = (await this.prisma.db.country.findUnique({ where: { code } })) as CountryRow | null;
      if (!country) return []; // nước không tồn tại → rỗng (không lộ)
      countryId = country.id;
    }

    const rows = (await this.prisma.db.auditEvent.findMany({
      where: countryId ? { countryId } : undefined,
      include: { actor: true, country: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })) as AuditRow[];

    return rows.map((r) => ({
      id: r.id,
      actorName: r.actor?.displayName ?? "—",
      action: r.action,
      countryCode: r.country?.code ?? null,
      targetType: r.targetType,
      targetId: r.targetId,
      metadata: r.metadata ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
