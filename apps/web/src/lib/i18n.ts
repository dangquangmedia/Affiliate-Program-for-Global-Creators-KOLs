// Nền i18n (N7): 2 ngôn ngữ vi/en + cơ chế FALLBACK, và format tiền theo locale.
// Locale đến từ country context của DB ("vi-VN", "fil-PH"). Chọn ngôn ngữ nội dung theo
// tiền tố: vi -> tiếng Việt; còn lại -> English (PH dùng en làm fallback theo kế hoạch).

export type Lang = "vi" | "en";

export function langFromLocale(locale: string): Lang {
  return locale.toLowerCase().startsWith("vi") ? "vi" : "en";
}

// Từ điển nhỏ, mở rộng dần theo màn. Thiếu key ở 1 ngôn ngữ -> fallback sang en.
const DICT: Record<Lang, Record<string, string>> = {
  vi: {
    "country.title": "Chọn quốc gia",
    "country.yourProfiles": "Hồ sơ của bạn",
    "country.using": "Đang dùng",
    "country.create": "Tạo hồ sơ",
    "country.switchTo": "Chuyển sang",
    "country.needLogin": "Bạn cần đăng nhập trước khi chọn quốc gia.",
    "country.nextKyc": "Tiếp tục: KYC",
  },
  en: {
    "country.title": "Choose country",
    "country.yourProfiles": "Your profiles",
    "country.using": "In use",
    "country.create": "Create profile",
    "country.switchTo": "Switch to",
    "country.needLogin": "You need to log in before choosing a country.",
    "country.nextKyc": "Next: KYC",
  },
};

/** Dịch 1 key theo ngôn ngữ, fallback sang en, cuối cùng trả chính key nếu vẫn thiếu. */
export function t(lang: Lang, key: string): string {
  return DICT[lang][key] ?? DICT.en[key] ?? key;
}

const SYMBOL: Record<string, string> = { VND: "₫", PHP: "₱", USD: "$" };

/** Format tiền từ minor units theo locale. VND exponent 0; PHP/USD exponent 2. */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const exponent = currency === "VND" ? 0 : 2;
  const value = minor / 10 ** exponent;
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
  const symbol = SYMBOL[currency] ?? "";
  return currency === "VND" ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}
