# MVP Scope — Affiliate GLOBAL

> Baseline: `v0.1`  
> Freeze date: 2026-07-17  
> Source: `Plan/docs/Book1.xlsx`, roadmap 5 tuần và audit liên tuần

## Product outcome trong 5 tuần

Một MVP local end-to-end cho VN và PH, chứng minh cùng một canonical model có thể chạy affiliate cho nhiều loại product/campaign mà không hard-code theo category hoặc network. MVP ưu tiên tính đúng của country isolation, workflow và money; không tuyên bố production-ready.

## P0 — 22 Must cam kết

- Core Platform: `CP-01`, `CP-02`, `CP-03`, `CP-04`, `CP-05`, `CP-06`, `CP-08`.
- Admin: `AD-01`, `AD-02`, `AD-03`, `AD-04`, `AD-06`, `AD-07`, `AD-09`.
- Creator: `CR-01` đến `CR-08`.

Core business path:

```text
Global identity → Country profile → KYC → Discover/Join campaign
→ Submit content → Ops approve → CONTENT_FLAT Pending Earning
→ Reconciliation → Available → Payout
```

## “Cover all product affiliate” ở mức kiến trúc

MVP không viết một flow riêng cho từng category. Khả năng mở rộng được tạo bởi:

- Canonical model `Product → Offer → Campaign`.
- Reward strategy theo `trigger + calculation`, không dùng tên network làm enum.
- Tracking asset cá nhân: link, code hoặc hashtag.
- Ledger append-only với adjustment/reversal.
- Sáu product archetype trong seed về sau; chỉ hai campaign chạy sâu E2E để bảo vệ chất lượng.

Canonical reward glossary:

| Trigger | Calculation | Phase 1 |
|---|---|---|
| `CONTENT_APPROVED` | `CONTENT_FLAT` | Core P0, chạy sâu |
| `PAID_ORDER` | `SALE_PERCENT` | P0b CPS, chỉ mở nếu G17 Green |
| `QUALIFIED_LEAD` | `LEAD_FLAT` | Modeled-only |
| `APP_INSTALL` | `INSTALL_FLAT` | Modeled-only |
| `SUBSCRIPTION` | `RECURRING_*` | Modeled-only |

## P0b — không chặn release

- Mock conversion ingest/import.
- Percentage commission từ mock paid order.
- Dedupe theo `provider + external_event_id`.

P0b mặc định `CUT`; chỉ mở tại G17 khi money/ledger/country/security P0 đều Green. G20/G25 không phụ thuộc CPS.

## P1 — 7 Should tách khỏi cam kết P0

`CP-07`, `CP-09`, `AD-05`, `AD-08`, `AD-10`, `CR-09`, `CR-10`.

## Ngoài phạm vi 5 tuần

- Brand self-service portal.
- Merchant/network connector thật, public API/webhook.
- Clickstream production-scale, arbitrary no-code rule engine, ML fraud scoring.
- Payment/eKYC production, native mobile, microservices/Kubernetes, BI nâng cao.
- Khẳng định tax/legal compliance thực tế; mọi tax/FX seed là synthetic demo data.

## Nguyên tắc cắt scope

Nếu trễ: cắt hi-fi/P1 trước, sau đó cắt P0b và giảm breadth archetype. Không cắt country isolation, RBAC/MFA, audit, ledger invariants, reconciliation, payout integrity hoặc four primary scenarios.

## Definition of success

Cuối Tuần 5 chỉ được báo `DONE` khi 22 Must có trace UI/API/DB/test/evidence, bốn journey E2E chạy được, clean setup tái lập được và không có blocker security/money.

## Source limitation

Phiên Ngày 1 không có Excel session/runtime spreadsheet chuẩn để đọc lại từng ô `Book1.xlsx`. Baseline này dùng 22 Must và 7 Should đã được trích/rà trong kế hoạch. Nếu workbook đã thay đổi sau baseline, phải re-diff workbook → RTM trước khi đổi G1 từ conditional sang final Green.

