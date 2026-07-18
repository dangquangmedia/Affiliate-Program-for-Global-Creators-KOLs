# Screen inventory — v0.3

> Hard cap: **12 core views**. Ngày 2 đã khóa 8 Creator views; Ngày 3 dùng 4 Admin/Finance views. Modal/drawer/tab/state variant không tạo view mới.

| View | Role | Area dự kiến | Primary job | Critical states | Requirement | Status |
|---|---|---|---|---|---|---|
| V01 | Creator | `/[country]/auth` | Login + chọn/nhận diện market | OAuth unavailable, callback error, session expired, invalid market | CR-01, CP-03 | MOCKED |
| V02 | Creator | `/[country]/profile` | Country profile + KYC wizard/checklist | Draft, Submitted, field Needs Changes, Approved, provider timeout | CR-02/03/04, CP-04/05 | MOCKED |
| V03 | Creator | `/[country]/campaigns` | Campaign discovery | Loading, empty, eligible/ineligible, full-derived, paused/ended | CR-05 | MOCKED |
| V04 | Creator | `/[country]/campaigns/[id]` | Terms/reward/eligibility + Join | KYC guard, duplicate join, budget/slot exhausted | CR-05, AD-09 | MOCKED |
| V05 | Creator | `/[country]/my-campaigns/[id]` | Tracking asset + content submit | invalid URL/platform/hashtag, duplicate/private, success | CR-05/06 | MOCKED |
| V06 | Creator | `/[country]/my-campaigns` | Campaign/content status timeline | Reviewing, rejected, resubmitted, approved, stale status | CR-05/06 | MOCKED |
| V07 | Creator | `/[country]/earnings` | Earnings list/detail | Pending/Confirmed/Available/Paid/Reversed; Gross/Tax/Net | CR-07, CP-06/08 | MOCKED |
| V08 | Creator | `/[country]/wallet` | Payout request/status | minimum guard, OTP expired, Failed release, UNKNOWN hold, Paid, reversal | CR-08, AD-07 | MOCKED |
| V09 | Admin | `/[country]/admin` | Role/country shell + config + audit drawer | denied, Global audited bypass, config version | CP-01/02, AD-01/02 | MOCKED |
| V10 | Ops | `/[country]/admin/review` | Unified KYC/content review | partial reject, stale conflict, bulk partial failure | AD-03/04 | MOCKED |
| V11 | Local Admin | `/[country]/admin/campaigns` | Product/Offer/Campaign builder | validation, localization, cap, activate/pause/close | AD-09 | MOCKED |
| V12 | Finance | `/[country]/finance` | Reconciliation + payout workbench | anomaly, locked, failure release, UNKNOWN reconcile, reversal | AD-06/07 | MOCKED |

## Creator view acceptance

Mỗi V01–V08 trong `creator-prototype.html` có: mục tiêu, data chính, primary CTA, enable/disable condition, persistent country/profile context và ít nhất một recovery path qua State variants.

## Scenario mapping

| Scenario | Shared views | Current result |
|---|---|---|
| S01 VN happy path | V01 → V02 → V03 → V04 → V05 → V06 → V07 → V08 | CLICKABLE |
| S02 PH KYC partial rejection | V01 → V02 variants → V02 Approved | CLICKABLE |
| S03 Content reject/resubmit | V05 → V10 → V06 → V10 → V07 | CLICKABLE |
| S04 Payout recovery | V08 → V12 variants → V08 | CLICKABLE |

## Tool evidence

- Figma draft was created at `https://www.figma.com/design/NV9XNBxt0ddqFflU29afE8`, but connector became unavailable before frames were written; blank draft is **not** counted as prototype evidence.
- Official Day 2–3 fallback evidence: `docs/product/mockup/creator-prototype.html`; snapshot phải ghi rõ thời điểm render.
