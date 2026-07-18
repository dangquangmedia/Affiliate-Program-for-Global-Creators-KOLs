# Evidence policy

## Mục tiêu

Mọi trạng thái `DONE` phải có bằng chứng tái lập được; tài liệu kế hoạch hoặc nội dung chat không phải bằng chứng runtime.

## Loại evidence hợp lệ

| Loại | Ví dụ | Quy tắc |
|---|---|---|
| Command | test/lint/migration/smoke output | Có command, exit code, thời điểm và phạm vi |
| Contract | RTM, API contract, decision log | Có version/status/owner; không thay thế runtime test |
| UI | screenshot/video/prototype snapshot | Gắn scenario, state và expected result |
| Data | query/invariant/export sample | Synthetic; không chứa PII hoặc secret |
| Security | negative cross-country/RBAC/idempotency test | Phải nêu actor, request và denial/assertion |

## Naming

`W<week>-D<day>-T<task>__<scenario-or-check>__<yyyy-mm-dd>.<ext>`

## Redaction

- Thay token/cookie/OTP bằng `[REDACTED]`.
- Mask bank/tax identifiers; chỉ giữ bốn ký tự cuối nếu cần chứng minh format.
- Không lưu KYC thật, signed URL còn hiệu lực hoặc raw provider payload có PII.

## Trạng thái chuẩn

- `PLANNED`: đã trace nhưng chưa thiết kế/triển khai.
- `DESIGN_READY`: contract/mockup đã qua gate, chưa khẳng định runtime.
- `SKELETON_VERIFIED`: chỉ walking skeleton đã chạy.
- `IN_PROGRESS`: có implementation nhưng thiếu acceptance/evidence.
- `DONE`: đủ implementation, test và evidence theo RTM.
- `CUT`: chủ động cắt khỏi release scope; ghi rõ lý do.

