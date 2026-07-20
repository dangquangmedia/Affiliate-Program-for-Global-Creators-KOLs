import { Inject, Injectable } from "@nestjs/common";
import { PrismaService, PrismaClientLike } from "../prisma.service";

/**
 * LedgerService — sổ cái APPEND-ONLY (bài toán khó #6). Nguồn sự thật cuối cùng về tiền.
 * NGUYÊN TẮC: chỉ CREATE, không bao giờ UPDATE/DELETE bản ghi tiền; sửa sai = ghi bút toán đảo
 * (REVERSAL) có link về bản gốc. Toàn bộ logic ghi sổ tập trung ở đây để mọi module tiền
 * (earning N11-12, payout N14-15) ghi cùng một cách + tôn trọng UNIQUE(ref_type,ref_id,entry_type)
 * ở DB (1 sự kiện không ghi sổ 2 lần — chống double-pay).
 */

export type LedgerEntryType =
  | "EARNING_ACCRUE"
  | "TAX"
  | "PAYOUT_RESERVE"
  | "PAYOUT_PAID"
  | "PAYOUT_RELEASE"
  | "REVERSAL";

export interface PostEntryInput {
  countryId: string;
  profileId: string;
  entryType: LedgerEntryType;
  amountMinor: bigint; // CÓ DẤU: +thu vào / −chi ra
  currency: string;
  refType: string; // 'earning' | 'payout' ...
  refId: string;
  earningId?: string | null;
  reversalOfId?: string | null;
}

export interface LedgerEntryDto {
  id: string;
  entryType: string;
  amountMinor: number;
  currency: string;
  refType: string;
  refId: string;
  createdAt: string;
  balanceAfterMinor: number; // số dư luỹ kế SAU bút toán này (tính lại từ sổ, không lưu)
}
export interface LedgerView {
  entries: LedgerEntryDto[]; // mới nhất trước
  balanceMinor: number; // = tổng amount_minor (nguồn sự thật về số dư sổ cái)
  currency: string | null;
}

type EntryRow = {
  id: string;
  entryType: string;
  amountMinor: bigint;
  currency: string;
  refType: string;
  refId: string;
  createdAt: Date;
};

@Injectable()
export class LedgerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Ghi 1 bút toán TRONG transaction có sẵn (append-only). Không tự mở transaction riêng. */
  async post(tx: PrismaClientLike, input: PostEntryInput): Promise<void> {
    await tx.ledgerEntry.create({
      data: {
        countryId: input.countryId,
        profileId: input.profileId,
        entryType: input.entryType,
        amountMinor: input.amountMinor,
        currency: input.currency,
        refType: input.refType,
        refId: input.refId,
        earningId: input.earningId ?? null,
        reversalOfId: input.reversalOfId ?? null,
      },
    });
  }

  /**
   * Ghi cặp bút toán khi 1 earning được DUYỆT: +gross (EARNING_ACCRUE) và −tax (TAX).
   * Số dư đóng góp = gross − tax = net. Cả hai cùng refType='earning'+refId=earning.id nhưng
   * khác entry_type nên không đụng UNIQUE(ref_type,ref_id,entry_type). Gọi trong CÙNG transaction
   * approve (content.service) để earning + sổ cái luôn nhất quán.
   */
  async postEarningAccrual(
    tx: PrismaClientLike,
    earning: { id: string; countryId: string; profileId: string; grossMinor: bigint; taxMinor: bigint; currency: string },
  ): Promise<void> {
    await this.post(tx, {
      countryId: earning.countryId,
      profileId: earning.profileId,
      entryType: "EARNING_ACCRUE",
      amountMinor: earning.grossMinor,
      currency: earning.currency,
      refType: "earning",
      refId: earning.id,
      earningId: earning.id,
    });
    if (earning.taxMinor > 0n) {
      await this.post(tx, {
        countryId: earning.countryId,
        profileId: earning.profileId,
        entryType: "TAX",
        amountMinor: -earning.taxMinor, // chi ra (dấu âm)
        currency: earning.currency,
        refType: "earning",
        refId: earning.id,
        earningId: earning.id,
      });
    }
  }

  /** Sổ cái của 1 creator trong 1 nước: bút toán (mới nhất trước) + số dư luỹ kế + tổng. */
  async view(profileId: string, countryId: string): Promise<LedgerView> {
    const rows = (await this.prisma.db.ledgerEntry.findMany({
      where: { profileId, countryId },
      orderBy: { createdAt: "asc" },
    })) as EntryRow[];

    let running = 0n;
    const asc: LedgerEntryDto[] = rows.map((r) => {
      running += r.amountMinor;
      return {
        id: r.id,
        entryType: r.entryType,
        amountMinor: Number(r.amountMinor),
        currency: r.currency,
        refType: r.refType,
        refId: r.refId,
        createdAt: r.createdAt.toISOString(),
        balanceAfterMinor: Number(running),
      };
    });

    return {
      entries: asc.reverse(), // hiển thị mới nhất trước
      balanceMinor: Number(running),
      currency: rows.length ? rows[rows.length - 1].currency : null,
    };
  }
}
