// Mock data cho khu prototype (N2/N3). KHÔNG gọi API/DB — đây là bản vẽ product để
// "nghĩ" luồng nghiệp vụ trước khi code thật (N6+). Số liệu cố định, không có PII thật.
//
// Money: luôn lưu MINOR UNITS (số nguyên) + currency code — không dùng float.
//   VND exponent 0 (1 = 1₫), PHP exponent 2 (100 = 1₱), USD exponent 2.
// Đây chính là "bài toán khó #2" thể hiện ngay trong mock: tiền không bao giờ là số thực.

export type Market = "VN" | "PH";
export type Currency = "VND" | "PHP" | "USD";

export interface MarketInfo {
  code: Market;
  name: string;
  flag: string;
  locale: string;
  currency: Currency;
  exponent: number;
}

export const MARKETS: Record<Market, MarketInfo> = {
  VN: { code: "VN", name: "Việt Nam", flag: "🇻🇳", locale: "vi-VN", currency: "VND", exponent: 0 },
  PH: { code: "PH", name: "Philippines", flag: "🇵🇭", locale: "en-PH", currency: "PHP", exponent: 2 },
};

// Tỷ giá tham chiếu TĨNH (mock, có công bố "demo only"). Dùng để hiển thị USD tham chiếu,
// KHÔNG dùng để thanh toán. minor local -> minor USD.
const USD_RATE: Record<Currency, number> = {
  VND: 0.0000393, // 1 VND ≈ 0.0000393 USD
  PHP: 0.0177, // 1 centavo ... xử lý theo exponent bên dưới
  USD: 1,
};

const SYMBOL: Record<Currency, string> = { VND: "₫", PHP: "₱", USD: "$" };

/** Format tiền từ minor units theo currency. VD formatMoney(500000,"VND") -> "500.000 ₫". */
export function formatMoney(minor: number, currency: Currency): string {
  const exponent = currency === "VND" ? 0 : 2;
  const value = minor / 10 ** exponent;
  const formatted = value.toLocaleString(currency === "VND" ? "vi-VN" : "en-US", {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
  return currency === "VND" ? `${formatted} ${SYMBOL[currency]}` : `${SYMBOL[currency]}${formatted}`;
}

/** Quy đổi minor local -> chuỗi USD tham chiếu (chỉ để hiển thị). */
export function toUsdReference(minor: number, currency: Currency): string {
  let major: number;
  if (currency === "VND") major = minor; // exponent 0
  else major = minor / 100; // exponent 2 (PHP)
  const usd = major * (currency === "VND" ? USD_RATE.VND : USD_RATE.PHP);
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---- Campaigns ----
export type CampaignStatus = "ACTIVE" | "PAUSED" | "ENDED";

export interface Campaign {
  id: string;
  market: Market;
  title: string;
  brand: string;
  rewardMinor: number; // giá cố định 1 content được duyệt (QĐ-1)
  currency: Currency;
  slotsTotal: number; // ngân sách = số suất × đơn giá (QĐ-3)
  slotsTaken: number;
  status: CampaignStatus;
  platform: string;
  requiredHashtag: string;
  brief: string;
}

// Campaign gắn với ĐÚNG MỘT market. Màn discovery lọc theo market của phiên -> minh họa
// trực quan "cách ly dữ liệu theo country" (bài toán khó #1): VN không thấy campaign PH.
export const CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_vn_beauty",
    market: "VN",
    title: "Review son mùa hè",
    brand: "GlowUp Cosmetics",
    rewardMinor: 500000,
    currency: "VND",
    slotsTotal: 50,
    slotsTaken: 12,
    status: "ACTIVE",
    platform: "TikTok",
    requiredHashtag: "#GlowUpHe2026",
    brief: "Quay 1 video ≥ 30s review son, gắn hashtag và link cửa hàng.",
  },
  {
    id: "cmp_vn_coffee",
    market: "VN",
    title: "Đánh giá cà phê lon",
    brand: "Highland Canned",
    rewardMinor: 350000,
    currency: "VND",
    slotsTotal: 30,
    slotsTaken: 30, // ĐẦY -> minh họa trạng thái derived "Full"
    status: "ACTIVE",
    platform: "Instagram",
    requiredHashtag: "#HighlandLon",
    brief: "1 bài Reels uống thử, nêu 3 điểm thích.",
  },
  {
    id: "cmp_vn_app",
    market: "VN",
    title: "Giới thiệu app học tiếng Anh",
    brand: "EngGo",
    rewardMinor: 800000,
    currency: "VND",
    slotsTotal: 20,
    slotsTaken: 5,
    status: "PAUSED", // tạm dừng -> không join được
    platform: "YouTube",
    requiredHashtag: "#EngGoChallenge",
    brief: "Video ≥ 60s trải nghiệm app trong 7 ngày.",
  },
  {
    id: "cmp_ph_snack",
    market: "PH",
    title: "Snack taste test",
    brand: "CrunchCo",
    rewardMinor: 120000, // ₱1,200.00 (minor, exponent 2)
    currency: "PHP",
    slotsTotal: 40,
    slotsTaken: 8,
    status: "ACTIVE",
    platform: "TikTok",
    requiredHashtag: "#CrunchCoPH",
    brief: "1 short video taste test, mention 2 flavors.",
  },
  {
    id: "cmp_ph_saas",
    market: "PH",
    title: "Freelancer tool walkthrough",
    brand: "WorkFlowPH",
    rewardMinor: 250000, // ₱2,500.00
    currency: "PHP",
    slotsTotal: 15,
    slotsTaken: 3,
    status: "ACTIVE",
    platform: "YouTube",
    requiredHashtag: "#WorkFlowPH",
    brief: "Walkthrough video, min 90s, show 3 features.",
  },
];

export function campaignsFor(market: Market): Campaign[] {
  return CAMPAIGNS.filter((c) => c.market === market);
}

export function slotsLabel(c: Campaign): { text: string; full: boolean } {
  const left = c.slotsTotal - c.slotsTaken;
  return { text: `${left}/${c.slotsTotal} suất còn lại`, full: left <= 0 };
}

// ---- KYC ----
export type KycFieldState = "EMPTY" | "FILLED" | "ACCEPTED" | "NEEDS_CHANGES";
export interface KycField {
  key: string;
  label: string;
  placeholder: string;
  state: KycFieldState;
  value?: string;
  reason?: string; // lý do bị từ chối (chỉ khi NEEDS_CHANGES)
}

export const KYC_FIELDS: KycField[] = [
  { key: "fullName", label: "Họ và tên", placeholder: "Nguyễn Văn A", state: "ACCEPTED", value: "Nguyễn Minh Anh" },
  { key: "idNumber", label: "Số CCCD/ID", placeholder: "0790xxxxxxx", state: "ACCEPTED", value: "079•••••••234" },
  {
    key: "bankAccount",
    label: "Tài khoản ngân hàng",
    placeholder: "Số tài khoản nhận tiền",
    state: "NEEDS_CHANGES",
    value: "1900•••4455",
    reason: "Tên chủ tài khoản không khớp họ tên trên giấy tờ.",
  },
  { key: "taxId", label: "Mã số thuế", placeholder: "Mã số thuế cá nhân", state: "ACCEPTED", value: "8•••••123" },
];

// ---- Earnings ----
export type EarningStatus = "PENDING" | "AVAILABLE" | "PAID" | "REVERSED";
export interface Earning {
  id: string;
  campaignTitle: string;
  grossMinor: number;
  taxMinor: number;
  currency: Currency;
  status: EarningStatus;
  createdAt: string;
}

export function netMinor(e: Earning): number {
  return e.grossMinor - e.taxMinor; // net = gross - tax, luôn tính lại, không lưu rời
}

// Thuế synthetic: VN demo 10%. (Có công bố "demo only".)
export const EARNINGS: Earning[] = [
  { id: "ern_1", campaignTitle: "Review son mùa hè", grossMinor: 500000, taxMinor: 50000, currency: "VND", status: "PAID", createdAt: "2026-07-10" },
  { id: "ern_2", campaignTitle: "Giới thiệu app học tiếng Anh", grossMinor: 800000, taxMinor: 80000, currency: "VND", status: "AVAILABLE", createdAt: "2026-07-15" },
  { id: "ern_3", campaignTitle: "Review son mùa hè", grossMinor: 500000, taxMinor: 50000, currency: "VND", status: "PENDING", createdAt: "2026-07-17" },
];

export function availableBalanceMinor(currency: Currency): number {
  return EARNINGS.filter((e) => e.status === "AVAILABLE" && e.currency === currency).reduce(
    (sum, e) => sum + netMinor(e),
    0,
  );
}

// ---- Payout ----
export interface PayoutRow {
  id: string;
  amountMinor: number;
  currency: Currency;
  state: "PROCESSING" | "PAID" | "FAILED_RELEASED" | "UNKNOWN_HOLD";
  requestedAt: string;
}

export const PAYOUT_HISTORY: PayoutRow[] = [
  { id: "po_1", amountMinor: 450000, currency: "VND", state: "PAID", requestedAt: "2026-07-11" },
];

export const PAYOUT_MIN_MINOR: Record<Currency, number> = { VND: 200000, PHP: 50000, USD: 1000 };
