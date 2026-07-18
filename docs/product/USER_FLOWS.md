# User flows — Day 1 outline v0.1

> Mục tiêu Ngày 1: khóa journey, state và handoff giữa vai trò để Ngày 2–3 vẽ low-fi; chưa phải clickable prototype.

## J01 — Creator onboarding và country context

```text
Anonymous
→ Sign in (real OAuth hoặc disclosed mock adapter)
→ Global session
→ Select/Create VN or PH Country Profile
→ Choose locale/currency preference
→ KYC checklist
→ Submit
→ Changes Requested ──resubmit rejected fields──┐
→ Approved <────────────────────────────────────┘
→ Eligible to Join
```

Guards:

- Route xác định market intent; server xác minh route với session/profile.
- Creator có thể xem campaign trước KYC nhưng join API chỉ cho KYC `Approved`.
- VN/PH profile, KYC, payout details độc lập.

## J02 — Campaign discovery, join và content

```text
Campaign Browse → Detail/Eligibility
  ├─ Ineligible / Paused / Closed / Full-derived → Explain, no join
  └─ Eligible → Join idempotently
       → Terms Snapshot + Personal Link/Code/Hashtag
       → My Campaigns
       → Draft Content → Submitted
            ├─ Rejected → Reason → New Version → Resubmitted
            └─ Approved → Commercial Pending Reward Source (once)
```

Guards:

- `Full` là derived eligibility, không phải campaign lifecycle.
- Terms snapshot không đổi khi Offer thay đổi sau join.
- Reward chỉ khi approve; reject/resubmit không tạo tiền.

## J03 — Ops review

```text
Ops sign in → MFA if policy requires → Scoped Queue
  ├─ KYC case → field approve/reject → case Approved/ChangesRequested
  └─ Content submission → reject/resubmit/approve
       → exactly-once reward source

Every critical action → Audit Event(actor, role, country, target, outcome, reason)
```

Guards:

- Local Ops chỉ thấy country được cấp quyền.
- Invalid transition/concurrent duplicate trả kết quả idempotent hoặc conflict rõ.
- Audit redact PII/secret.

## J04 — Earnings, reconciliation và payout

```text
Approved Content
→ Commercial Pending Source
→ G16 Financialize (tax + reference FX snapshots)
→ Official Pending Earning + balanced journal
→ Finance Reconciliation Line Approved = Confirmed
→ Batch Locked = Available
→ Creator Payout Request + OTP = Reserved
→ Provider Attempt
   ├─ Success → Paid
   ├─ Confirmed pre-payment failure → release once → Available
   └─ Timeout → UNKNOWN + hold reserve → reconcile
          ├─ terminal failure → release once
          └─ terminal success → Paid
→ Post-success refund → linked Reversal; Paid history remains
```

Guards:

- Money integer minor unit + currency; không dùng floating point.
- Local currency là sổ/payout chính; USD chỉ reference snapshot.
- Duplicate command/provider event không tạo money effect thứ hai.

## J05 — Campaign configuration và country operation

```text
Admin/Ops → Select authorized country
→ Product → Offer(trigger + calculation + terms)
→ Campaign(country + schedule + slot/budget)
→ Validate → Activate
→ Monitor basic counters → CSV export
→ Pause/Close
```

Guards:

- `CONTENT_APPROVED + CONTENT_FLAT` là executable core.
- Capability modeled-only hoặc CPS CUT không được activate.
- Counters/export bắt buộc cùng country scope.

## State inventory cần thể hiện trong mockup

| Domain | States | Required UI behavior |
|---|---|---|
| Global auth | Anonymous, Authenticating, Authenticated, SessionExpired | loading/error/retry; mock disclosure |
| MFA/OTP | Required, Sent, Verified, Expired, AttemptsExceeded | countdown, error reason, audit-safe copy |
| Country profile | None, Creating, Active, Switching, Suspended | market marker; route/context mismatch |
| KYC | Draft, Submitted, InReview, ChangesRequested, Resubmitted, Approved | field reasons, accepted-field retention |
| Campaign lifecycle | Draft, Active, Paused, Closed | activation errors; immutable historical snapshot |
| Campaign eligibility | Eligible, Ineligible, Full-derived, BudgetBlocked | reason + disabled action; no fake lifecycle state |
| Participation | NotJoined, Joining, Joined | idempotent join/loading/success |
| Content | Draft, Submitted, Rejected, Resubmitted, Approved | version timeline and reason |
| Earning | Pending, Confirmed, Available, Paid, Reversed | source + Gross/Tax/Net + ledger explanation |
| Reconciliation | Open, Reviewing, Anomaly, Locked | lock confirmation/immutable state |
| Payout | Requested, Reserved, Processing, Failed, UNKNOWN, Paid, Reversed | UNKNOWN warning, retry guard, attempt timeline |
| Provider/async UI | Idle, Loading, Empty, Partial, Error, Retryable, Terminal | no silent failure; localized reason |

## Common view-state checklist cho Ngày 2–3

Mỗi core view phải có tối thiểu: loading, empty, populated, validation error, permission denied, wrong-country denial, provider/server error, success feedback và locale fallback khi có copy động.

## Handoff sang mockup

- Ngày 2 đã khóa Creator screens `V01–V08` và S01/S02.
- Ngày 3 đã khóa Admin/Finance screens `V09–V12` và hoàn tất clickable S03/S04 xuyên vai trò.
- Không thêm core view thứ 13; biến thể dùng tabs/drawer/modal/state trong 12 view đã khóa.
