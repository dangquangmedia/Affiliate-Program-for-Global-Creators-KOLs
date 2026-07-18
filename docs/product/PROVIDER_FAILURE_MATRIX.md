# Provider failure and recovery matrix

> Gate G3, version `v0.1`. Provider adapters gồm OAuth, OTP/MFA, private upload và payout. Mock phải được disclose và phát deterministic outcome cho test.

| Provider / outcome | System classification | State + money effect | User/Ops copy | Allowed recovery | Idempotency + audit |
|---|---|---|---|---|---|
| OAuth success | Success | Authenticated; no money | Đăng nhập thành công | Continue selected market | callback/state/nonce consumed once; redact token |
| OAuth validation failure | Terminal validation | Anonymous; no session | Callback không hợp lệ hoặc đã dùng | Restart login | replay denied; audit provider code only |
| OAuth timeout/5xx | Retryable unknown before session | Authenticating; no session | Chưa thể xác nhận đăng nhập | Status check, then retry new attempt | correlation id; never log credential |
| OTP sent + verified | Success | Intent Verified; no reserve until request | OTP đã xác minh | Create payout once | intent/key one-use; redact OTP |
| OTP wrong/expired/limit | Terminal validation | Expired/AttemptsExceeded; **no reserve** | Sai/hết hạn/vượt số lần | Start new intent after cooldown | attempt count audit, no OTP value |
| Upload success | Success | private object reference/version | Tải lên thành công | Submit case/content | checksum+key dedupe; signed URL not audited |
| Upload validation failure | Terminal validation | no accepted version | Sai loại/kích thước/nội dung private | Correct file and retry | no orphan public object; reason code |
| Upload timeout | Unknown object result | do not submit case yet | Chưa xác định kết quả tải lên | query upload status; retry same key | checksum/idempotency key resolves duplicate |
| Payout accepted/processing | Non-terminal success | Request Processing; reserve held | Nhà cung cấp đang xử lý | Poll/reconcile | attempt append-only; provider request key unique |
| Payout confirmed success | Terminal success | Reserved -> Paid exactly once | Thanh toán thành công | None; show receipt | unique provider event; duplicate callback no-op |
| Payout validation failure before dispatch | Terminal validation | no request/no reserve, or release only if reserve existed by design | Thông tin nhận tiền không hợp lệ | Fix profile then new intent/request | validation code; no provider retry |
| Payout confirmed pre-payment failure | Terminal failure | FailedFinal; Reserved -> Available **once** | Chưa thanh toán; số dư đã hoàn | New request/attempt with new key | unique release journal; duplicate failure no-op |
| Payout timeout / ambiguous response | `UNKNOWN` | reserve **held**, no Paid/release | Chưa xác định; không thử lại để tránh trả hai lần | authoritative status lookup/reconcile only | retry/release blocked; reconciliation audit |
| Unknown -> confirmed failure | Terminal resolution | release reserve once | Không thanh toán; số dư đã hoàn | New request allowed after terminal state | resolution event unique |
| Unknown -> confirmed success | Terminal resolution | Reserved -> Paid once | Đã thanh toán sau đối soát | None | conflicting later event escalates, no overwrite |
| Duplicate callback/event | Duplicate | return existing state; **zero new money effect** | Đã xử lý trước đó | None | unique provider+external_event_id |
| Retry after FailedFinal | New business attempt | reserve once under new request/attempt per policy | Đang thử lại | monitor new attempt | never overwrite prior attempt/key |
| Retry while Unknown | Invalid action | state/money unchanged | Phải đối soát kết quả hiện tại trước | Reconcile only | `409 PAYOUT_RESULT_UNKNOWN` + denied audit |
| Post-success refund/reversal | Terminal compensating event | Paid history kept; append linked Reversal/adjustment | Giao dịch bị hoàn sau thanh toán | Finance review; no silent re-pay | refund event unique; balanced linked journal |

## Deterministic mock outcomes

| Fixture | Outcome | Expected assertion |
|---|---|---|
| `pay_success_001` | immediate success | one Paid effect |
| `pay_fail_pre_001` | confirmed failure | one release effect despite replay |
| `pay_timeout_then_success_001` | timeout then lookup success | Unknown holds reserve, then one Paid effect |
| `pay_timeout_then_fail_001` | timeout then lookup failure | Unknown holds reserve, then one release effect |
| `pay_success_refund_001` | success then refund | Paid remains in history + linked reversal |
| repeat same provider event ID | duplicate | same response, no new journal |

## Operational rules

- Exponential backoff chỉ dùng cho transport-safe status lookup; không tự replay payout command khi kết quả mơ hồ.
- Circuit breaker mở thì request mới ở Queue, không giả `FailedFinal`; reserve policy phải hiển thị rõ.
- Alert khi Unknown vượt SLA, callback mâu thuẫn, amount/currency mismatch hoặc reconciliation không cân.
- Evidence không chứa raw token, OTP, bank account, KYC identifier hay provider payload chưa redact.

