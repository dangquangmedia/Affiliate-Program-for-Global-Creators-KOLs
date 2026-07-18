# Screen-to-data contract — v0.3

> Đây là contract thiết kế, chưa phải API/schema implementation. Endpoint/entity là tên dự kiến và sẽ freeze tại G4.

| View | Reads | Writes / command | Permission + country rule | State transitions | Audit event | Primary CTA guard |
|---|---|---|---|---|---|---|
| V01 Login/market | public country config, provider availability | `StartOAuth`, `CompleteOAuth`, `SelectMarket` | Public config; callback tạo global session, route market phải hợp lệ | Anonymous → Authenticating → Authenticated | auth start/success/failure, mock disclosure | Market valid; callback/state/nonce valid |
| V02 Profile/KYC | global user, country profile, KYC checklist/case/field versions, locale/currency | `CreateCountryProfile`, `UpdatePreferences`, `SubmitKyc`, `ResubmitRejectedFields` | Owner profile; active country; Ops data không lộ | Draft → Submitted → ChangesRequested → Resubmitted → Approved | profile create/switch, KYC submit/resubmit | Chỉ rejected fields editable; required valid |
| V03 Discovery | active campaigns, eligibility reason, derived capacity | filter/search only | Query active country; pre-KYC view allowed | No lifecycle mutation | optional search telemetry, no PII | Detail available; join chưa xảy ra |
| V04 Detail/Join | campaign, offer/reward, localized terms, budget/slot, eligibility | `JoinCampaign(idempotencyKey)` | Active country + KYC Approved + eligible | NotJoined → Joining → Joined | join attempted/succeeded/denied | Active, eligible, capacity/budget available |
| V05 Workspace/Submit | participation snapshot, personal assets, content rules | `CreateContentDraft`, `SubmitContent` | Participation owner + active country | Draft → Submitted | asset viewed/copied; submit | URL/platform/hashtag/code valid, content public |
| V06 My Campaigns | participation, deliverable versions, review reason/timeline | `ResubmitContent` | Owner + active country | Rejected → Resubmitted; Approved terminal for version | resubmit and status access | Reject reason present; only new version mutable |
| V07 Earnings | earning source, terms/tax/FX snapshots, journal projection, status totals | no financial mutation from Creator | Owner + active country; no cross-country totals | Pending → Confirmed → Available → Paid/Reversed (read) | sensitive earnings view if policy requires | Payout CTA only when Available ≥ minimum |
| V08 Wallet/Payout | available/reserved, payout profile, attempts/provider events | `RequestPayout`, `VerifyOtp`, `RefreshPayoutStatus` | Owner + active country; OTP/MFA; idempotency required | Requested → Reserved → Processing → Paid/Failed/UNKNOWN/Reversed | request, OTP outcome, provider/reconcile/reversal | Valid profile, balance/minimum, OTP; UNKNOWN blocks retry |
| V09 Admin shell | role assignments, authorized countries, country config versions, redacted audit | `ActivateCountryConfig`, `SelectAuthorizedCountry`, `OpenAudit` | Local Admin same country; Global requires bypass permission/MFA/reason | Config Draft → Active version; no business aggregate mutation | config change, country switch/bypass, audit access/export | version current; schema valid; explicit cross-country authorization |
| V10 Ops review | scoped KYC/content queues, active field/version, prior decisions | `ClaimReview`, `RequestChanges`, `Reject`, `Approve` | Local Ops same country; Finance denied; direct foreign ID concealed | Submitted/Resubmitted → InReview → NeedsChanges/Rejected/Approved | claim and every decision including denied/stale | current version; reason for reject; unresolved KYC fields absent for approve |
| V11 Campaign builder | Product, Offer/reward rule, campaign/localization/cap/config | `SaveDraft`, `Activate`, `Pause`, `Resume`, `Close` | Local Admin same country; conditional Ops; Global explicit bypass | Draft → Active ↔ Paused → Closed; Full/Ended derived | draft/version and lifecycle command outcome | executable reward, valid terms/date/cap/config; current version |
| V12 Finance workbench | Pending earnings, batch/lines/anomalies, payout request/attempt/event/journal | `ApproveLine`, `ApproveBatch`, `LockBatch`, `ReconcilePayout`, `CreateAdjustment` | Local Finance same country + MFA; Ops/Admin denied | Batch Draft → Reviewing → Approved → Locked → Exported; payout Unknown → terminal | line/batch lock, provider resolution, release/reversal | balanced/no blocker; Locked immutable; Unknown only reconcile |

## Data invariants visible in UI

- Country is server-authorized context, never trusted from hidden/body field.
- Money uses integer minor units + currency; USD is reference snapshot only.
- Join stores immutable terms snapshot.
- Content approval produces one core reward source; replay produces no second source.
- Locked reconciliation/payout history is immutable; correction uses linked record.
- Confirmed failure and UNKNOWN use different copy/action: failure can release once; UNKNOWN holds reserve.

## Common state contract

Every view must render `loading`, `empty`, `permission denied`, `session expired`, `validation/provider error`, `success` and localized fallback where applicable. Prototype exposes variants from the right-side State panel.
