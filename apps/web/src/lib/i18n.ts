// Nền i18n (N7, mở rộng N16): 2 ngôn ngữ vi/en + cơ chế FALLBACK, format tiền theo locale,
// và USD tham chiếu. Locale đến từ country context của DB ("vi-VN", "en-PH"). `langFromLocale`
// dùng cho route thật (server localize theo nước); khu mockup dùng công tắc ngôn ngữ tường minh
// (usePrefs) để demo đổi ngôn ngữ theo ý người dùng, độc lập với nước đang xem.

export type Lang = "vi" | "en";

export function langFromLocale(locale: string): Lang {
  return locale.toLowerCase().startsWith("vi") ? "vi" : "en";
}

// Từ điển mở rộng theo màn. Thiếu key ở 1 ngôn ngữ -> fallback sang en -> cuối cùng trả chính key.
// GIỮ NGUYÊN chuỗi vi khớp UI cũ để không vỡ E2E (assert văn bản tiếng Việt).
const DICT: Record<Lang, Record<string, string>> = {
  vi: {
    // -- chung / điều hướng --
    "nav.allScreens": "← Tất cả màn",
    "nav.login": "Đăng nhập",
    "common.loading": "Đang tải…",
    "common.needLoginTitle": "Bạn cần đăng nhập",
    // -- ContextBanner --
    "ctx.label": "Ngữ cảnh",
    "ctx.language": "ngôn ngữ",
    "ctx.currency": "tiền tệ",
    // -- USD --
    "usd.refNote": "tỷ giá tham chiếu, demo",
    "usd.show": "Hiện USD",
    // -- V01 login --
    "login.title": "Đăng nhập",
    "login.noteQ": "Màn này trả lời:",
    "login.noteBody":
      "làm sao creator vào hệ thống mà không phải tạo mật khẩu riêng? → Đăng nhập 1 chạm bằng SSO (mock). 1 tài khoản dùng chung cho nhiều nước; chọn nước ở màn kế tiếp.",
    "login.noteHard":
      "SSO thật được mock có công bố — mentor hỏi thì đây là chỗ cắm OAuth Google/TikTok thật sau này. Nút bên dưới gọi API auth thật: tạo user + session trong DB, không còn là hình tĩnh.",
    "login.stNormal": "Bình thường",
    "login.stOauthDown": "SSO lỗi",
    "login.stExpired": "Phiên hết hạn",
    "login.expiredBadge": "Phiên đã hết hạn",
    "login.expiredBody":
      "Bạn đã đăng nhập trước đó nhưng phiên hết hạn. Đăng nhập lại để tiếp tục — không mất dữ liệu hồ sơ.",
    "login.signedInTitle": "Đã đăng nhập",
    "login.signedInSub": "Session thật đã tạo trong DB (bảng sessions).",
    "login.hello": "Xin chào {name}. Bước tiếp theo: chọn quốc gia để tạo hồ sơ riêng cho nước đó.",
    "login.logout": "Đăng xuất",
    "login.welcomeTitle": "Chào mừng đến Affiliate GLOBAL",
    "login.welcomeSub": "Kiếm thu nhập từ nội dung của bạn.",
    "login.oauthDownBadge": "Không kết nối được nhà cung cấp SSO",
    "login.oauthDownBody":
      "Dịch vụ đăng nhập đang tạm gián đoạn. Thử lại sau ít phút — đây là lỗi phía nhà cung cấp, không phải tài khoản của bạn.",
    "login.errorBadge": "Đăng nhập lỗi",
    "login.google": "Đăng nhập với Google",
    "login.tiktok": "Đăng nhập với TikTok",
    "login.signingIn": "Đang đăng nhập…",
    "login.retry": "↻ Thử lại",
    "login.consent": "Bằng việc đăng nhập, bạn đồng ý với điều khoản. (Phase 1: SSO là mock, hiển thị công khai để minh bạch.)",
    "login.failed": "Đăng nhập thất bại — thử lại sau.",
    "login.thenOk": "Đăng nhập thành công → ",
    "login.thenPending": "Đăng nhập xong sẽ → ",
    "login.chooseCountry": "chọn quốc gia",
    // -- V02 country --
    "country.title": "Chọn quốc gia",
    "country.yourProfiles": "Hồ sơ của bạn",
    "country.using": "Đang dùng",
    "country.create": "Tạo hồ sơ",
    "country.creating": "Đang tạo…",
    "country.switchTo": "Chuyển sang",
    "country.needLogin": "Bạn cần đăng nhập trước khi chọn quốc gia.",
    "country.nextKyc": "Tiếp tục: KYC",
    "country.loadingProfiles": "Đang tải hồ sơ…",
    "country.noteQ": "Màn này trả lời:",
    "country.noteBody":
      "1 tài khoản toàn cầu nhưng hồ sơ (KYC, ngân hàng, thuế, thu nhập) phải RIÊNG từng nước vì luật mỗi nước khác nhau. → Creator chọn/tạo hồ sơ theo nước, và có thể chuyển qua lại.",
    "country.noteHard":
      "Bài toán khó #1: dữ liệu 2 nước không được trộn. Nút bên dưới gọi API thật (`POST /me/country/:market`) — hồ sơ cột vào user của PHIÊN, không nhận userId từ client.",
    "country.profileOf": "Hồ sơ {name}",
    "country.dbContext": "Ngữ cảnh từ DB:",
    "country.localeLine": "locale {locale} (fallback {fallback}).",
    "country.formatExample": "Ví dụ định dạng tiền theo locale:",
    "country.noProfiles": "Chưa có hồ sơ nước nào — tạo một hồ sơ để tiếp tục.",
    // -- V07 earnings --
    "earnings.title": "Thu nhập",
    "earnings.noteQ": "Màn này trả lời:",
    "earnings.noteBody":
      "tôi kiếm được bao nhiêu, tiền đang ở trạng thái nào? → Mỗi khoản hiện rõ Gross – Thuế – Net và vòng đời PENDING → AVAILABLE → PAID.",
    "earnings.noteHard":
      "Bài toán khó #2 (tiền = số nguyên minor units, Net = Gross − Thuế tính lại) & #6: số dư là nguồn sự thật ở SỔ CÁI APPEND-ONLY bên dưới — không sửa, chỉ ghi thêm.",
    "earnings.overview": "Tổng quan thu nhập",
    "earnings.overviewSub": "Số dư khả dụng để rút chỉ tính phần đã đối soát (AVAILABLE) — N13.",
    "earnings.totalGross": "Tổng Gross (tất cả)",
    "earnings.totalTax": "Tổng Thuế (demo)",
    "earnings.totalNet": "Tổng Net",
    "earnings.badgePending": "Chờ đối soát: {v}",
    "earnings.badgeAvailable": "Rút được: {v}",
    "earnings.badgePaid": "Đã trả: {v}",
    "earnings.ledgerBalance": "Số dư sổ cái (đã trừ thuế):",
    "earnings.empty": "Chưa có thu nhập. Hãy",
    "earnings.emptyJoin": "tham gia campaign",
    "earnings.emptyTail": "và nộp nội dung được duyệt.",
    "earnings.recordedAt": "Ghi nhận {date}",
    "earnings.gross": "Gross (tổng)",
    "earnings.tax": "Thuế (demo)",
    "earnings.net": "Net (thực nhận)",
    "earnings.ledgerTitle": "Sổ cái (append-only)",
    "earnings.ledgerSub":
      "Mọi thay đổi tiền là 1 dòng ghi THÊM, không sửa/xoá. Sửa sai = ghi bút toán đảo có link gốc.",
    "earnings.noEntries": "Chưa có bút toán nào.",
    "earnings.balanceShort": "dư {v}",
    "earnings.toWallet": "Muốn rút tiền khả dụng? →",
    "earnings.walletLink": "Ví & rút tiền",
    "earnings.toWalletTail": "(mở khi có đối soát — N13/N14)",
    // trạng thái earning
    "earnings.st.PENDING": "Chờ đối soát",
    "earnings.st.AVAILABLE": "Rút được",
    "earnings.st.PAID": "Đã trả",
    "earnings.st.REVERSED": "Đã đảo",
    // nhãn bút toán
    "ledger.EARNING_ACCRUE": "Ghi nhận thu nhập",
    "ledger.TAX": "Khấu trừ thuế",
    "ledger.PAYOUT_RESERVE": "Giữ tiền rút",
    "ledger.PAYOUT_PAID": "Đã chi trả",
    "ledger.PAYOUT_RELEASE": "Hoàn về số dư",
    "ledger.REVERSAL": "Bút toán đảo",
    // -- V08 wallet --
    "wallet.title": "Ví & rút tiền",
    "wallet.noteQ": "Màn này trả lời:",
    "wallet.noteBody":
      "tôi rút tiền thế nào? → Rút cần OTP; số tiền được giữ chỗ (reserve) khi gửi lệnh (ghi sổ −amount).",
    "wallet.noteHard":
      "Bấm 2 lần vẫn 1 lệnh (idempotency key UNIQUE). Bài toán #4: FAIL → hoàn 1 lần / UNKNOWN → giữ chờ đối soát.",
    "wallet.balanceTitle": "Số dư khả dụng",
    "wallet.withdrawable": "Rút được ({cur})",
    "wallet.min": "Tối thiểu mỗi lần rút",
    "wallet.balanceHint": "Số dư = net đã đối soát (AVAILABLE) − các lệnh đang giữ tiền. Chưa đủ? Tiền còn",
    "wallet.balanceHintLink": "PENDING chờ đối soát",
    "wallet.request": "Yêu cầu rút tiền",
    "wallet.belowMin": "Chưa đủ mức tối thiểu",
    "wallet.otpLine": "OTP (mock, dev hiển thị):",
    "wallet.otpLineTail": "— nhập vào bên dưới.",
    "wallet.amountLabel": "Số tiền rút ({cur}, minor units)",
    "wallet.otpLabel": "Mã OTP (6 chữ số)",
    "wallet.otpPlaceholder": "6 chữ số",
    "wallet.confirm": "Xác nhận rút (giữ chỗ)",
    "wallet.sending": "Đang gửi…",
    "wallet.cancel": "Huỷ",
    "wallet.badAmount": "Số tiền không hợp lệ.",
    "wallet.noOtp": "Không phát được OTP.",
    "wallet.historyTitle": "Lịch sử lệnh rút",
    "wallet.historySub": "Mỗi lệnh là bản ghi riêng — không ghi đè. Provider mock được Finance xử lý (V12).",
    "wallet.noPayouts": "Chưa có lệnh rút nào.",
    // trạng thái payout
    "wallet.st.PROCESSING": "Đang xử lý (đã giữ chỗ)",
    "wallet.st.PAID": "Đã trả",
    "wallet.st.FAILED_RELEASED": "Lỗi → đã hoàn",
    "wallet.st.UNKNOWN_HOLD": "Không rõ → đang giữ",
  },
  en: {
    "nav.allScreens": "← All screens",
    "nav.login": "Log in",
    "common.loading": "Loading…",
    "common.needLoginTitle": "You need to log in",
    "ctx.label": "Context",
    "ctx.language": "language",
    "ctx.currency": "currency",
    "usd.refNote": "reference rate, demo",
    "usd.show": "Show USD",
    "login.title": "Log in",
    "login.noteQ": "This screen answers:",
    "login.noteBody":
      "how does a creator get in without creating a separate password? → One-tap sign-in via SSO (mock). One account shared across countries; pick a country on the next screen.",
    "login.noteHard":
      "Real SSO is mocked, disclosed — when the mentor asks, this is where real Google/TikTok OAuth plugs in later. The button below calls the real auth API: it creates a user + session in the DB, no longer a static image.",
    "login.stNormal": "Normal",
    "login.stOauthDown": "SSO down",
    "login.stExpired": "Session expired",
    "login.expiredBadge": "Session has expired",
    "login.expiredBody":
      "You were signed in before but the session expired. Sign in again to continue — no profile data is lost.",
    "login.signedInTitle": "Signed in",
    "login.signedInSub": "A real session was created in the DB (sessions table).",
    "login.hello": "Hi {name}. Next step: choose a country to create a per-country profile.",
    "login.logout": "Log out",
    "login.welcomeTitle": "Welcome to Affiliate GLOBAL",
    "login.welcomeSub": "Earn from your content.",
    "login.oauthDownBadge": "Could not reach the SSO provider",
    "login.oauthDownBody":
      "The sign-in service is temporarily interrupted. Try again in a few minutes — this is a provider-side error, not your account.",
    "login.errorBadge": "Sign-in error",
    "login.google": "Sign in with Google",
    "login.tiktok": "Sign in with TikTok",
    "login.signingIn": "Signing in…",
    "login.retry": "↻ Retry",
    "login.consent": "By signing in, you agree to the terms. (Phase 1: SSO is a mock, shown openly for transparency.)",
    "login.failed": "Sign-in failed — try again later.",
    "login.thenOk": "Signed in → ",
    "login.thenPending": "After signing in → ",
    "login.chooseCountry": "choose a country",
    "country.title": "Choose country",
    "country.yourProfiles": "Your profiles",
    "country.using": "In use",
    "country.create": "Create profile",
    "country.creating": "Creating…",
    "country.switchTo": "Switch to",
    "country.needLogin": "You need to log in before choosing a country.",
    "country.nextKyc": "Next: KYC",
    "country.loadingProfiles": "Loading profiles…",
    "country.noteQ": "This screen answers:",
    "country.noteBody":
      "one global account, but each profile (KYC, bank, tax, earnings) must be SEPARATE per country because laws differ. → The creator picks/creates a per-country profile and can switch between them.",
    "country.noteHard":
      "Hard problem #1: data from two countries must never mix. The button below calls the real API (`POST /me/country/:market`) — the profile is tied to the SESSION's user, never a client-supplied userId.",
    "country.profileOf": "{name} profile",
    "country.dbContext": "Context from DB:",
    "country.localeLine": "locale {locale} (fallback {fallback}).",
    "country.formatExample": "Money format example by locale:",
    "country.noProfiles": "No country profile yet — create one to continue.",
    "earnings.title": "Earnings",
    "earnings.noteQ": "This screen answers:",
    "earnings.noteBody":
      "how much did I earn, and what state is the money in? → Each amount shows Gross – Tax – Net and the lifecycle PENDING → AVAILABLE → PAID.",
    "earnings.noteHard":
      "Hard problem #2 (money = integer minor units, Net = Gross − Tax recomputed) & #6: the balance's source of truth is the APPEND-ONLY LEDGER below — never edited, only appended.",
    "earnings.overview": "Earnings overview",
    "earnings.overviewSub": "Withdrawable balance counts only the reconciled part (AVAILABLE) — N13.",
    "earnings.totalGross": "Total Gross (all)",
    "earnings.totalTax": "Total Tax (demo)",
    "earnings.totalNet": "Total Net",
    "earnings.badgePending": "Pending: {v}",
    "earnings.badgeAvailable": "Withdrawable: {v}",
    "earnings.badgePaid": "Paid: {v}",
    "earnings.ledgerBalance": "Ledger balance (after tax):",
    "earnings.empty": "No earnings yet. Please",
    "earnings.emptyJoin": "join a campaign",
    "earnings.emptyTail": "and submit approved content.",
    "earnings.recordedAt": "Recorded {date}",
    "earnings.gross": "Gross (total)",
    "earnings.tax": "Tax (demo)",
    "earnings.net": "Net (received)",
    "earnings.ledgerTitle": "Ledger (append-only)",
    "earnings.ledgerSub":
      "Every money change is an APPENDED row, never edited/deleted. Fix a mistake with a reversal entry linked to the original.",
    "earnings.noEntries": "No entries yet.",
    "earnings.balanceShort": "bal {v}",
    "earnings.toWallet": "Want to withdraw the available balance? →",
    "earnings.walletLink": "Wallet & withdraw",
    "earnings.toWalletTail": "(opens once reconciled — N13/N14)",
    "earnings.st.PENDING": "Pending",
    "earnings.st.AVAILABLE": "Withdrawable",
    "earnings.st.PAID": "Paid",
    "earnings.st.REVERSED": "Reversed",
    "ledger.EARNING_ACCRUE": "Earning accrued",
    "ledger.TAX": "Tax withheld",
    "ledger.PAYOUT_RESERVE": "Payout reserved",
    "ledger.PAYOUT_PAID": "Paid out",
    "ledger.PAYOUT_RELEASE": "Released to balance",
    "ledger.REVERSAL": "Reversal entry",
    "wallet.title": "Wallet & withdraw",
    "wallet.noteQ": "This screen answers:",
    "wallet.noteBody":
      "how do I withdraw? → Withdrawing needs an OTP; the amount is reserved when the request is sent (ledger −amount).",
    "wallet.noteHard":
      "Clicking twice still yields one request (idempotency key UNIQUE). Hard problem #4: FAIL → refund once / UNKNOWN → hold pending review.",
    "wallet.balanceTitle": "Available balance",
    "wallet.withdrawable": "Withdrawable ({cur})",
    "wallet.min": "Minimum per withdrawal",
    "wallet.balanceHint": "Balance = reconciled net (AVAILABLE) − amounts on hold. Not enough? Funds are still",
    "wallet.balanceHintLink": "PENDING awaiting reconciliation",
    "wallet.request": "Request withdrawal",
    "wallet.belowMin": "Below minimum",
    "wallet.otpLine": "OTP (mock, shown in dev):",
    "wallet.otpLineTail": "— enter it below.",
    "wallet.amountLabel": "Withdrawal amount ({cur}, minor units)",
    "wallet.otpLabel": "OTP code (6 digits)",
    "wallet.otpPlaceholder": "6 digits",
    "wallet.confirm": "Confirm withdrawal (reserve)",
    "wallet.sending": "Sending…",
    "wallet.cancel": "Cancel",
    "wallet.badAmount": "Invalid amount.",
    "wallet.noOtp": "Could not issue OTP.",
    "wallet.historyTitle": "Withdrawal history",
    "wallet.historySub": "Each request is its own record — never overwritten. Mock provider is processed by Finance (V12).",
    "wallet.noPayouts": "No withdrawals yet.",
    "wallet.st.PROCESSING": "Processing (reserved)",
    "wallet.st.PAID": "Paid",
    "wallet.st.FAILED_RELEASED": "Failed → refunded",
    "wallet.st.UNKNOWN_HOLD": "Unknown → on hold",
  },
};

/** Dịch 1 key theo ngôn ngữ + thay {placeholder}; fallback sang en, cuối cùng trả chính key. */
export function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
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

// Tỷ giá tham chiếu TĨNH (mock, "demo only") — chỉ để HIỂN THỊ USD, không dùng thanh toán.
const USD_RATE: Record<string, number> = { VND: 0.0000393, PHP: 0.0177 };

/** Quy đổi minor local -> chuỗi USD tham chiếu (chỉ hiển thị). VND exp0; PHP exp2. */
export function usdReference(minor: number, currency: string): string {
  const major = currency === "VND" ? minor : minor / 100;
  const usd = major * (USD_RATE[currency] ?? 0);
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
