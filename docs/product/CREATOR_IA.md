# Creator information architecture — v0.2

> Gate target: G2  
> Prototype: `docs/product/mockup/creator-prototype.html`

## Navigation model

```text
Global entry
└─ V01 Login + market
   └─ V02 Country profile + KYC

Authenticated country shell (country/profile luôn visible)
├─ Discover
│  ├─ V03 Campaign discovery
│  └─ V04 Campaign detail + Join
├─ My Campaigns
│  ├─ V05 Workspace + tracking asset + submit
│  └─ V06 Content/status/version timeline
├─ Earnings
│  ├─ V07 Earnings list/detail
│  └─ V08 Wallet + payout request/status
└─ Profile
   └─ V02 Profile/KYC/locale/currency
```

## Trace CR-01 đến CR-08

| Requirement | Entry/view | Primary outcome |
|---|---|---|
| CR-01 | V01 | Global auth với real/mock disclosure và callback recovery |
| CR-02 | V01, V02 | Create/switch country profile độc lập |
| CR-03 | V02 + persistent shell | Locale/currency theo profile |
| CR-04 | V02 | Country KYC, partial rejection và resubmit |
| CR-05 | V03–V05 | Discover/detail/join và personal tracking asset |
| CR-06 | V05–V06 | Submit, reject reason, version và resubmit |
| CR-07 | V06–V07 | Source, Gross/Tax/Net và lifecycle |
| CR-08 | V07–V08 | Available balance, OTP, reserve/provider/recovery |

## Persistent context

Mọi authenticated view phải hiển thị: country code/flag, local currency, locale và country-profile ID. Market switch thay toàn bộ profile-scoped data; không copy KYC, participation, content, earning hoặc payout balance xuyên country.

## Navigation guard

- View campaign trước KYC được phép; Join command yêu cầu KYC Approved.
- My Campaigns yêu cầu participation trong active country.
- Earnings/Wallet chỉ query active country; local currency là số chính.
- Sensitive command sau session expiry/MFA failure không được tiếp tục ngầm.

## Recovery map

| Variant | Recovery action |
|---|---|
| Loading/provider retryable | Retry cùng country context và idempotency key |
| Empty | Đưa về Discover hoặc onboarding next action |
| Validation | Focus đúng field, giữ input hợp lệ |
| KYC needs changes | Chỉ mở rejected field; accepted field khóa |
| Permission/wrong country | Về profile được cấp quyền; không trả data partial |
| Session expired | Sign in lại rồi restore safe route, không replay sensitive command |
| Provider UNKNOWN | Giữ reserve; refresh/reconcile, không retry payout |
| Stale/conflict | Reload current state trước action mới |

