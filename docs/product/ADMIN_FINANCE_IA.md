# Admin & Finance information architecture

> Version: `v0.1` — khóa cho Gate G3, ngày 2026-07-17.  
> Nguyên tắc: một role-based shell, deny-by-default, country context luôn hiển thị; backend tái kiểm tra mọi action.

## 1. Navigation và 4 core views

| View | Actor chính | Khu vực / tab | Primary job | Handoff nhận từ Creator | Handoff trả về |
|---|---|---|---|---|---|
| V09 Admin shell | Local Admin, Global Admin | Country config, role context, audit drawer | Chọn authorized country; xem/sửa config version; tra critical audit | Profile/country intent, mọi critical action | Config active cho V01–V12; audit evidence |
| V10 Review queue | Local Ops | KYC queue, Content queue, review workbench | Review field/version đúng country và đúng state | V02 KYC Submitted; V05/V06 Content Submitted/Resubmitted | Reason/decision về V02/V06; Approved Content sang Earning |
| V11 Campaign builder | Local Admin | Product, Offer/Reward, Campaign, localization/cap | Validate và activate/pause/close campaign | Country config từ V09 | Campaign/terms/reward/eligibility cho V03–V05 |
| V12 Finance workbench | Local Finance | Reconciliation, batch lock, payout attempts, audit | Confirm earning, lock batch, reconcile provider ambiguity/reversal | V07 Pending Earning; V08 Payout Request | Available/Paid/Failed/Unknown/Reversed về V07/V08 |

Không tạo core view thứ 13: queue detail, audit, config history, provider event và confirmation là tab/drawer/modal/state trong V09–V12.

## 2. Role shell và context contract

```text
Authenticated session
  -> role assignments
  -> MFA gate (Finance, Global Admin)
  -> authorized country selector
  -> country banner + role + config version
  -> navigation filtered by permission
  -> command submitted without trusting body country_id
  -> API derives country from route + authorized session
  -> state/permission guard
  -> action outcome + append-only audit
```

- Local actor chỉ có country được cấp; direct ID thuộc country khác trả `404` để không lộ tồn tại. List/count/export trả dữ liệu đã scope, không bao giờ nhận body để đổi scope.
- Global Admin chỉ thấy lựa chọn cross-country khi có `country:bypass`; command bắt buộc reason và audit source/target country.
- UI ẩn CTA trái quyền hoặc trái state để giảm lỗi thao tác. API vẫn là nơi quyết định cuối và trả `403`, `404`, `409` hoặc `422` rõ ràng.
- Header luôn hiện `Role · Country · Currency · Config version`; màn Finance thêm MFA state.

## 3. Handoff map end-to-end

| Handoff | Producer state/event | Consumer/action | Guard | Kết quả / recovery |
|---|---|---|---|---|
| Creator -> Ops KYC | V02 `KYC_SUBMITTED` | V10 claim/review field | same country; Ops role; current version | Approve hoặc Needs Changes + reason; stale version -> refresh |
| Ops -> Creator KYC | `KYC_FIELD_CHANGES_REQUESTED` | V02 edit rejected fields | own profile; exact rejected fields | Resubmit new versions; accepted history retained |
| Creator -> Ops Content | V05 `CONTENT_SUBMITTED/RESUBMITTED` | V10 review active version | participation active; same country | Reject + reason hoặc approve exactly once |
| Ops -> Money | `CONTENT_APPROVED` | financialization source | unique deliverable business key | one Pending Earning; replay -> idempotent result |
| Admin -> Creator | V11 `CAMPAIGN_ACTIVATED/PAUSED/CLOSED` | V03–V05 discover/join/submit guards | valid Product->Offer->Campaign; country config | Active discoverable; paused/closed action blocked |
| Earning -> Finance | V07 `EARNING_PENDING` | V12 reconcile line | same currency/country; no unresolved anomaly | Approve -> Confirmed; anomaly stays Reviewing |
| Finance -> Creator | V12 `BATCH_LOCKED` | V07 refresh | immutable batch; idempotent lock | eligible Confirmed -> Available |
| Creator -> Finance/provider | V08 `PAYOUT_RESERVED` | V12 attempt/reconcile | OTP verified; balance reserved once | Paid; failure release once; Unknown hold |
| Any critical action -> Audit | attempted + outcome | V09 audit drawer | permission-filtered, redact PII/secrets | append-only evidence; export scoped |

## 4. Queue prioritization và recovery

1. V10 ưu tiên oldest SLA, rồi risk flag; filter country cố định theo shell. KYC và Content không bulk-approve qua khác loại.
2. Claim/review dùng record version. `409 STALE_VERSION` phải tải trạng thái mới, không ghi đè quyết định actor khác.
3. V12 tách reconciliation batch và payout attempts. Locked batch không có Edit/Unlock; correction tạo adjustment.
4. Payout `UNKNOWN` chỉ có `Reconcile provider`; Retry/Release bị ẩn và API deny cho đến terminal result.
5. Provider/event duplicate hiển thị `Already processed`, không biến thành lỗi làm người vận hành bấm lại.

## 5. Requirement và scenario trace

| View | Must IDs | Scenario |
|---|---|---|
| V09 | CP-01, CP-02, AD-01, AD-02 | S01–S04 audit/country shell |
| V10 | AD-03, AD-04, CP-02 | S01, S02, S03 |
| V11 | AD-09, CP-01, CP-02 | S01, S03 |
| V12 | AD-06, AD-07, CP-06, CP-08 | S01, S04 |

