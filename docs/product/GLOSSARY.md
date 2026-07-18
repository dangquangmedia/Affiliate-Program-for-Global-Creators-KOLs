# Product glossary

| Thuật ngữ | Định nghĩa canonical |
|---|---|
| Global User | Identity dùng chung; không chứa KYC/bank/tax theo country |
| Country Profile | Hồ sơ người dùng độc lập trong một market VN/PH; giữ locale, currency, KYC và payout details |
| Market/Country Context | Country được suy ra từ route và xác minh với session/permission ở server; không tin `country_id` từ body |
| Product | Thứ được quảng bá; độc lập với commercial terms và campaign |
| Offer | Commercial terms áp dụng cho product: trigger, calculation, rate/cap/eligibility |
| Campaign | Chương trình chạy trong country/time/budget/slot cụ thể, tham chiếu offer |
| Participation | Quan hệ Creator đã join campaign; giữ terms snapshot bất biến |
| Tracking Asset | Link, code hoặc hashtag cá nhân gắn với participation |
| Content Deliverable | Nội dung Creator nộp; một participation P0 có một deliverable được reward |
| Reward Trigger | Business event làm phát sinh khả năng thưởng, ví dụ `CONTENT_APPROVED`, `PAID_ORDER` |
| Reward Calculation | Cách tính thưởng, ví dụ `CONTENT_FLAT`, `SALE_PERCENT` |
| CPS | Business label cho `PAID_ORDER + SALE_PERCENT`; không phải enum strategy |
| Earning | Record thu nhập có source, terms/tax/FX snapshot và lifecycle |
| Pending | Earning đã ghi nhận nhưng chưa được Finance xác nhận |
| Confirmed | Reconciliation line đã được Finance approve |
| Available | Batch đã lock và số tiền đủ điều kiện payout |
| Reserved | Available balance đã được giữ cho một payout request |
| Paid | Provider đã xác nhận payout thành công; lịch sử không bị ghi đè |
| Reversal/Adjustment | Bút toán liên kết để đảo/điều chỉnh; không xóa hoặc sửa lịch sử gốc |
| Reconciliation Batch | Tập line Finance kiểm tra, approve và lock để chuyển tiền đủ điều kiện sang Available |
| UNKNOWN | Provider timeout/ambiguous result; giữ reserve và reconcile trước retry/release |
| Confirmed Failure | Provider xác nhận chưa trả tiền; release reserve đúng một lần |
| Post-success Refund | Hoàn tiền sau success; tạo linked reversal, không đổi Paid thành failed |
| Gross / Tax / Net | Gross trước thuế; Tax theo versioned synthetic rule; Net = Gross - Tax |
| Reference FX | Tỷ giá snapshot dùng hiển thị USD tham chiếu; payout vẫn theo local currency |
| Local Ops | Role vận hành trong một country, xử lý KYC/content/campaign theo permission |
| Local Finance | Role trong một country, reconciliation/payout; bắt buộc MFA |
| Global Admin | Role có quyền cross-country rõ ràng; mọi bypass phải audit |
| Idempotency | Cùng một command/event business key lặp lại không tạo record hoặc money effect trùng |
| P0 | Scope bắt buộc để release MVP |
| P0b | Extension chứng minh khả năng mở rộng; mặc định cut và không chặn release |
| P1 | Should/stretch chỉ làm sau P0 quality gate |
| Evidence | Bằng chứng tái lập: command/test/screenshot/query gắn với acceptance; chat/plan không phải runtime evidence |

