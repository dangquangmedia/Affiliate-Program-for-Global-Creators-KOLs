import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthContext } from "../auth/auth.service";
import { assertStaffForCountry } from "../auth/rbac";

// Bộ trường KYC chuẩn (khớp mockup V03). Thêm/bớt ở đây là nguồn sự thật cho cả tạo & duyệt.
const KYC_CHECKLIST: { key: string; label: string }[] = [
  { key: "fullName", label: "Họ và tên" },
  { key: "idNumber", label: "Số CCCD/ID" },
  { key: "bankAccount", label: "Tài khoản ngân hàng" },
  { key: "taxId", label: "Mã số thuế" },
];
const FIELD_KEYS = new Set(KYC_CHECKLIST.map((c) => c.key));
const OPS_ROLES = ["LOCAL_OPS", "LOCAL_ADMIN"];

export type FieldState = "EMPTY" | "FILLED" | "ACCEPTED" | "NEEDS_CHANGES";
export type CaseState = "DRAFT" | "SUBMITTED" | "RESUBMITTED" | "APPROVED" | "REJECTED";

export interface KycFieldDto {
  key: string;
  label: string;
  value: string | null;
  state: FieldState;
  reason: string | null;
}
export interface KycCaseDto {
  caseId: string;
  state: CaseState;
  fields: KycFieldDto[];
}
export interface KycQueueItem {
  caseId: string;
  creatorName: string;
  state: CaseState;
  pendingFields: number; // số trường chưa ACCEPTED — Ops cần xử lý
  fields: KycFieldDto[]; // đủ để Ops duyệt theo từng field ngay trên hàng đợi
}

export interface FieldDecision {
  key: string;
  decision: "ACCEPT" | "NEEDS_CHANGES";
  reason?: string;
}

type CountryRow = { id: string; code: string; enabled: boolean };
type FieldRow = { key: string; label: string; value: string | null; state: FieldState; reason: string | null };
type CaseRow = { id: string; profileId: string; state: CaseState; fields: FieldRow[] };
type CaseWithProfile = CaseRow & { profile: { countryId: string; user: { displayName: string } } };

@Injectable()
export class KycService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

  // Hồ sơ creator cho (user, nước) — get-or-create để KYC không vỡ nếu vào thẳng URL.
  private async ensureProfileId(userId: string, countryId: string): Promise<string> {
    const profile = await this.prisma.db.creatorCountryProfile.upsert({
      where: { userId_countryId: { userId, countryId } },
      create: { userId, countryId },
      update: {},
    });
    return profile.id;
  }

  private toDto(c: CaseRow): KycCaseDto {
    // Trả về theo đúng thứ tự checklist để UI ổn định.
    const byKey = new Map(c.fields.map((f) => [f.key, f]));
    return {
      caseId: c.id,
      state: c.state,
      fields: KYC_CHECKLIST.map((def) => {
        const f = byKey.get(def.key);
        return {
          key: def.key,
          label: def.label,
          value: f?.value ?? null,
          state: (f?.state ?? "EMPTY") as FieldState,
          reason: f?.reason ?? null,
        };
      }),
    };
  }

  private async loadOrCreateCase(profileId: string): Promise<CaseRow> {
    const existing = (await this.prisma.db.kycCase.findUnique({
      where: { profileId },
      include: { fields: true },
    })) as CaseRow | null;
    if (existing) return existing;

    return (await this.prisma.db.kycCase.create({
      data: {
        profileId,
        state: "DRAFT",
        fields: { create: KYC_CHECKLIST.map((c) => ({ key: c.key, label: c.label, state: "EMPTY" })) },
      },
      include: { fields: true },
    })) as CaseRow;
  }

  /** Creator xem hồ sơ KYC của mình cho 1 nước (tạo nháp nếu chưa có). */
  async getMyCase(userId: string, market: string): Promise<KycCaseDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);
    return this.toDto(await this.loadOrCreateCase(profileId));
  }

  /**
   * Creator nộp/nộp lại KYC. Chỉ cập nhật field CHƯA được duyệt (ACCEPTED bị khoá) → khi bị
   * trả lại chỉ phải sửa đúng field NEEDS_CHANGES, không nhập lại từ đầu. Case chuyển
   * SUBMITTED (lần đầu) hoặc RESUBMITTED (sau khi bị REJECTED).
   */
  async submit(userId: string, market: string, values: Record<string, string>): Promise<KycCaseDto> {
    const country = await this.requireCountry(market);
    const profileId = await this.ensureProfileId(userId, country.id);
    const current = await this.loadOrCreateCase(profileId);
    const lockedByKey = new Map(current.fields.map((f) => [f.key, f.state === "ACCEPTED"]));

    for (const [key, raw] of Object.entries(values)) {
      if (!FIELD_KEYS.has(key)) continue; // bỏ qua key lạ (không tin client)
      if (lockedByKey.get(key)) continue; // field đã duyệt: khoá, không cho ghi đè
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value) continue;
      await this.prisma.db.kycField.update({
        where: { caseId_key: { caseId: current.id, key } },
        data: { value, state: "FILLED", reason: null },
      });
    }

    const nextState: CaseState = current.state === "REJECTED" ? "RESUBMITTED" : "SUBMITTED";
    await this.prisma.db.kycCase.update({ where: { id: current.id }, data: { state: nextState } });

    const reloaded = (await this.prisma.db.kycCase.findUnique({
      where: { id: current.id },
      include: { fields: true },
    })) as CaseRow;
    return this.toDto(reloaded);
  }

  /** Ops xem hàng đợi KYC của NƯỚC MÌNH (chỉ case chờ xử lý). */
  async getQueue(auth: AuthContext, market: string): Promise<KycQueueItem[]> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, OPS_ROLES);

    const rows = (await this.prisma.db.kycCase.findMany({
      where: { state: { in: ["SUBMITTED", "RESUBMITTED"] }, profile: { countryId: country.id } },
      include: { profile: { include: { user: true } }, fields: true },
      orderBy: { updatedAt: "asc" },
    })) as CaseWithProfile[];

    return rows.map((c) => ({
      caseId: c.id,
      creatorName: c.profile.user.displayName,
      state: c.state,
      pendingFields: c.fields.filter((f) => f.state !== "ACCEPTED").length,
      fields: this.toDto(c).fields,
    }));
  }

  /**
   * Ops duyệt/từ chối THEO TỪNG FIELD (mỗi field: ACCEPT | NEEDS_CHANGES + lý do bắt buộc).
   * Sau khi áp: mọi field ACCEPTED → case APPROVED; còn field chưa đạt → REJECTED (creator
   * nộp lại). Cách ly: case phải thuộc nước của Ops, nếu không → 404 (không lộ tồn tại).
   */
  async review(auth: AuthContext, market: string, caseId: string, decisions: FieldDecision[]): Promise<KycCaseDto> {
    const country = await this.requireCountry(market);
    assertStaffForCountry(auth, country.id, OPS_ROLES);

    const kcase = (await this.prisma.db.kycCase.findUnique({
      where: { id: caseId },
      include: { profile: true, fields: true },
    })) as CaseWithProfile | null;

    // Không thuộc nước Ops (hoặc không tồn tại) → 404: Ops VN không mở được case PH.
    if (!kcase || kcase.profile.countryId !== country.id) {
      throw new NotFoundException({ code: "RESOURCE_NOT_FOUND", message: "KYC case not found in this country." });
    }

    for (const d of decisions) {
      if (!FIELD_KEYS.has(d.key)) continue;
      if (d.decision === "NEEDS_CHANGES") {
        const reason = d.reason?.trim();
        if (!reason) {
          throw new BadRequestException({ code: "VALIDATION_ERROR", message: `Reason required to reject "${d.key}".` });
        }
        await this.prisma.db.kycField.update({
          where: { caseId_key: { caseId, key: d.key } },
          data: { state: "NEEDS_CHANGES", reason },
        });
      } else {
        await this.prisma.db.kycField.update({
          where: { caseId_key: { caseId, key: d.key } },
          data: { state: "ACCEPTED", reason: null },
        });
      }
    }

    const reloaded = (await this.prisma.db.kycCase.findUnique({
      where: { id: caseId },
      include: { fields: true },
    })) as CaseRow;
    const allAccepted = reloaded.fields.every((f) => f.state === "ACCEPTED");
    const nextState: CaseState = allAccepted ? "APPROVED" : "REJECTED";
    await this.prisma.db.kycCase.update({
      where: { id: caseId },
      data: { state: nextState, reviewedBy: auth.user.id, reviewedAt: new Date() },
    });

    return this.toDto({ ...reloaded, state: nextState });
  }
}
