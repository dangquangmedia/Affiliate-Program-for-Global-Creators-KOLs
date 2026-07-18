# Four primary demo scenarios

> Version: `v0.1` — acceptance backbone cho mockup, API, DB và E2E test.  
> Core scenarios chỉ dùng `CONTENT_APPROVED + CONTENT_FLAT`; CPS/P0b không được chặn scenario.

## S01 — VN happy path end-to-end

**Business goal:** chứng minh một Creator VN đi từ global identity đến payout thành công, có audit và local money.

**Preconditions**

- VN config active: `vi-VN`, `VND`, synthetic tax rule, mock payment provider.
- Product/Offer/Campaign VN active, còn slot/budget; reward `CONTENT_FLAT`.
- Creator chưa có VN profile; Local Ops và Local Finance có MFA.

| Step | Actor/action | Expected state | Money effect | Must IDs |
|---:|---|---|---|---|
| 1 | Creator sign in và tạo VN profile | Global session; VN profile selected | None | CR-01, CR-02, CP-03/04 |
| 2 | Chọn VI/VND, submit KYC | KYC `Submitted` | None | CR-03/04, CP-05/06 |
| 3 | VN Ops approve KYC | KYC `Approved` | None | AD-01/02/04 |
| 4 | Creator discover và join campaign | Participation `Joined`; personal link/code/hashtag | None | CR-05, AD-09 |
| 5 | Creator submit content | Deliverable `Submitted` | None | CR-06 |
| 6 | VN Ops approve content | Deliverable `Approved`; one commercial pending source | Không double money | AD-03 |
| 7 | Financialization/backfill | Earning `Pending`, Gross/Tax/Net + snapshot; balanced initial journal | Pending increases once | CP-06/08, CR-07 |
| 8 | Finance approve line và lock batch | `Confirmed → Available`; batch `Locked` | Available increases once | AD-06 |
| 9 | Creator request payout + OTP; provider success | Reserve → `Paid` | Available decreases; Paid increases once | AD-07, CR-08 |
| 10 | Creator/Ops xem history/audit | Timeline complete, scoped VN | None | AD-02, CP-02 |

**Critical negative assertions**

- Duplicate join/approve/batch lock/payout callback không tạo duplicate participation, earning hoặc journal effect.
- PH local role không list/count/export/read bất kỳ record VN nào.
- USD nếu hiển thị chỉ là reference; payout và ledger base vẫn VND.
- Raw OTP/token/PII không xuất hiện trong audit/evidence.

**Pass evidence:** Creator UI timeline, admin review, earnings detail, balanced journal query, payout attempt/provider event, audit trail, isolation test.

## S02 — PH KYC partial rejection và country isolation

**Business goal:** chứng minh KYC theo country có field-level reason, partial resubmit và không lẫn VN/PH.

**Preconditions**

- Creator có global identity và hai profile VN/PH.
- PH config active: Filipino/EN fallback, PHP, PH KYC checklist.
- PH Ops có đúng country scope.

| Step | Actor/action | Expected state | Money effect | Must IDs |
|---:|---|---|---|---|
| 1 | Creator switch sang PH profile | PH context verified | None | CP-03/04, CR-02/03 |
| 2 | Submit PH KYC với một document không đạt | KYC `Submitted` | None | CR-04 |
| 3 | PH Ops reject đúng field, ghi reason | KYC `ChangesRequested`; accepted fields giữ nguyên | None | AD-04/02 |
| 4 | Creator mở status bằng Filipino; missing key fallback EN | Reason/status readable | None | CP-05 |
| 5 | Creator resubmit riêng field bị reject | New field version; case `Submitted` | None | CR-04 |
| 6 | PH Ops approve | KYC `Approved`; join được phép | None | AD-04, CR-05 |

**Critical negative assertions**

- Trước khi Approved, direct join API trả denial rõ dù UI bị bypass.
- VN Ops không mở/review được PH case; body `country_id=VN` không thay authorized context.
- Resubmit không xóa accepted field/version/history cũ.
- File private không có public URL; audit redact identifier nhạy cảm.

**Pass evidence:** KYC field timeline, locale fallback screenshot, 403 cross-country, DB version history và audit redaction.

## S03 — Content reject, resubmit, approve và exactly-once reward

**Business goal:** chứng minh content workflow không happy-path-only và reward core chỉ phát sinh khi approve.

**Preconditions**

- Creator đã KYC Approved và join campaign còn hiệu lực.
- Participation có personal tracking asset; campaign `CONTENT_FLAT`.

| Step | Actor/action | Expected state | Money effect | Must IDs |
|---:|---|---|---|---|
| 1 | Creator submit URL/file content | Deliverable `Submitted` | Zero | CR-06 |
| 2 | Ops reject với reason | `Rejected`; reason visible | Zero | AD-03/02 |
| 3 | Creator resubmit version mới | `Resubmitted/Submitted`; history giữ nguyên | Zero | CR-06 |
| 4 | Ops approve version mới | `Approved`; source business key committed | Commercial pending created once | AD-03 |
| 5 | G16 financialize source | Official Earning `Pending` + tax/FX snapshot | Pending Net increases once | CP-08, CR-07 |
| 6 | Replay approve command/event | State unchanged/idempotent response | No second earning/journal | AD-03, AD-02 |

**Critical negative assertions**

- Reject/resubmit không tạo earning.
- Version cũ đã reject không thể approve sau khi version mới active.
- Creator/country khác không đọc hoặc mutate deliverable.
- Campaign paused/closed/full-derived behavior rõ; `Full` không trở thành lifecycle state.

**Pass evidence:** submission version timeline, reason UI, duplicate approve test, unique source key và earning count = 1.

## S04 — Payout confirmed failure, UNKNOWN recovery, success và linked reversal

**Business goal:** chứng minh payout không double-pay/double-release khi provider có failure hoặc kết quả mơ hồ.

**Preconditions**

- Creator có Available balance bằng local currency và payout profile hợp lệ.
- Finance/Creator OTP mock có expiry + attempt limit + audit.
- Provider mock hỗ trợ deterministic outcomes.

| Step | Actor/action | Expected state | Money effect | Must IDs |
|---:|---|---|---|---|
| 1 | Creator request payout bằng idempotency key A + OTP | Request `Reserved` | Available giảm, Reserved tăng đúng một lần | CR-08, AD-01/07 |
| 2 | Provider xác nhận pre-payment failure | Attempt `Failed`; reserve released | Reserved giảm, Available hoàn lại đúng một lần | AD-07 |
| 3 | Retry hợp lệ bằng attempt/key mới B | New attempt `Processing` | Reserve lại đúng một lần | CR-08 |
| 4 | Provider timeout | Attempt `UNKNOWN` | Reserve giữ nguyên | AD-07 |
| 5 | User retry/release trong UNKNOWN | Request bị chặn | Không money effect | AD-07 |
| 6 | Reconcile provider xác nhận success | Attempt `Paid` | Reserved giảm, Paid tăng một lần | AD-07, CR-07 |
| 7 | Duplicate success callback | Idempotent/no-op | Không double Paid | AD-02/07 |
| 8 | Provider post-success refund | Linked reversal record | Paid history giữ; Reversed/adjustment tăng | AD-07, CR-07/08 |

**Critical negative assertions**

- Expired/wrong OTP hoặc vượt attempt limit không reserve tiền.
- Confirmed failure callback lặp lại không release lần hai.
- UNKNOWN không tự chuyển Failed chỉ vì timeout; mọi retry/release cần terminal reconciliation.
- Refund không overwrite `Paid`; ledger luôn balanced và audit có provider event business key.
- Local Finance PH không xử lý payout VN.

**Pass evidence:** before/after balances, payout request/attempt/event timeline, duplicate callback tests, linked reversal và balanced journal.

## Scenario-to-release rule

- S01–S04 đều là P0 và phải có clickable prototype trong Tuần 1, implementation E2E vào các tuần sau.
- P0b CPS có thể được demo bổ sung ở S01/S03 chỉ sau G17; không sửa precondition hoặc pass condition của core scenario.
- Một scenario chỉ `DONE` khi mọi negative assertion liên quan có test/evidence, không chỉ khi happy path chạy.

