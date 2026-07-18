# Domain state machines — Gate G3

> Version `v0.1`, 2026-07-17. Đây là design contract, chưa phải runtime implementation.  
> Mọi command dùng authorized country context từ route/session, optimistic version và idempotency key khi có money/provider effect.

## Quy ước chung

- `403/404`: role/country không hợp lệ; `409`: stale version/invalid transition; `422`: guard nghiệp vụ không đạt.
- Audit tối thiểu: actor, role, authorized country, aggregate/id, command, before/after, outcome, reason, correlation/idempotency key, timestamp; redact PII/OTP/token.
- Idempotent replay cùng key + cùng payload trả kết quả cũ. Cùng key khác payload trả `409 IDEMPOTENCY_CONFLICT`.
- Transition không liệt kê là deny. UI có thể ẩn action, nhưng API luôn kiểm tra actor, country, state và version.

## SM-01 — KYC Case + Field

Case: `Draft -> Submitted -> InReview -> NeedsChanges -> Resubmitted -> InReview -> Approved`; terminal alternative `Rejected`. Field giữ version/decision riêng.

| From -> To | Actor; command/event | Guard | Side effect + audit | Idempotency / invalid action |
|---|---|---|---|---|
| Draft -> Submitted | Creator; `SubmitKyc` | own profile; required fields valid/private uploads | freeze submitted field versions; `KYC_SUBMITTED` | key per case/version; missing field `422` |
| Submitted/Resubmitted -> InReview | Local Ops; `ClaimKyc` | same country; unclaimed or expired claim | assign reviewer/SLA; audit claim | replay same reviewer no-op; other reviewer `409` |
| InReview -> NeedsChanges | Local Ops; `RequestFieldChanges` | >=1 field reason; current version | append field decisions; accepted fields remain locked | duplicate decision no-op; empty reason `422` |
| NeedsChanges -> Resubmitted | Creator; `ResubmitKycFields` | only own fields marked changes; new version | append only rejected field versions | editing accepted field `409 FIELD_LOCKED` |
| InReview -> Approved | Local Ops; `ApproveKyc` | all required current fields accepted | append approval; enables join | replay no-op; unresolved field `422` |
| InReview -> Rejected | Local Ops; `RejectKycFinal` | policy reason + evidence code | terminal rejection, history retained | Creator cannot resubmit terminal case; create appeal/new case by policy |

## SM-02 — Campaign

Lifecycle: `Draft -> Active <-> Paused -> Closed`; schedule may derive display `Ended`. `Full` is eligibility derived from slot/budget, never a lifecycle state.

| From -> To | Actor; command/event | Guard | Side effect + audit | Idempotency / invalid action |
|---|---|---|---|---|
| Draft -> Draft | Local Admin; `EditCampaign` | same country; editable version | save localization/cap/brief | version check; stale update `409` |
| Draft -> Active | Local Admin; `ActivateCampaign` | Product/Offer/reward executable; dates/cap/config valid | publish version; discoverable | key per version; modeled-only reward `422` |
| Active -> Paused | Local Admin; `PauseCampaign` | reason required | stop new join; existing participation policy retained | replay no-op |
| Paused -> Active | Local Admin; `ResumeCampaign` | schedule/config/cap valid | enable eligibility evaluation | ended schedule `422` |
| Active/Paused -> Closed | Local Admin; `CloseCampaign` | confirmation + reason | terminal; stop join | closed -> active/edit denied `409` |
| Any -> derived Ended/Full | System query; schedule/cap evaluation | now beyond end / capacity exhausted | display eligibility reason only | no `SetFull`/`SetEnded` command exists |

## SM-03 — Participation

Lifecycle: `Joined -> Active -> Suspended -> Active`, then `Completed` or `Cancelled` terminal.

| From -> To | Actor; command/event | Guard | Side effect + audit | Idempotency / invalid action |
|---|---|---|---|---|
| none -> Joined | Creator; `JoinCampaign` | own Approved KYC; Active; eligible; capacity transaction succeeds | create immutable terms/reward/commission snapshot + tracking asset | unique profile+campaign; replay returns same participation |
| Joined -> Active | System; `ActivateParticipation` | assets provisioned | open deliverable workspace | event replay no-op |
| Active -> Suspended | Ops/Admin; `SuspendParticipation` | same country; reason/code | block new submission, retain history | repeat no-op; wrong country `404` |
| Suspended -> Active | Ops/Admin; `RestoreParticipation` | issue resolved | reopen workspace | terminal participation cannot restore |
| Active/Suspended -> Completed | System/Ops; `CompleteParticipation` | obligations terminal | close new deliverables; keep earning rights | replay no-op |
| Joined/Active/Suspended -> Cancelled | Creator/Admin; `CancelParticipation` | policy permits; reason | stop future submissions; snapshot/history retained | cannot cancel Completed `409` |

## SM-04 — Content Submission

Lifecycle: `Draft -> Submitted -> InReview -> NeedsChanges/Rejected -> Resubmitted -> InReview -> Approved`.

| From -> To | Actor; command/event | Guard | Side effect + audit | Idempotency / invalid action |
|---|---|---|---|---|
| Draft -> Submitted | Creator; `SubmitContent` | own active participation; URL/file/platform/hashtag valid | append v1, enqueue review | key per submission/version; invalid/private/duplicate `422` |
| Submitted/Resubmitted -> InReview | Local Ops; `ClaimContent` | same country; active version | claim current version | stale claim `409` |
| InReview -> NeedsChanges/Rejected | Local Ops; `RejectContent` | reason + policy code | append decision, notify Creator | replay no-op; blank reason `422` |
| NeedsChanges/Rejected -> Resubmitted | Creator; `ResubmitContent` | own submission; new valid version | append version; old version immutable | same content hash returns prior result; old version cannot reactivate |
| InReview -> Approved | Local Ops; `ApproveContent` | current active version; participation eligible | commit unique reward source; emit `CONTENT_APPROVED` | unique deliverable reward key; replay creates no second earning |
| Approved -> Approved | System; replay approval/event | matching source key | return existing outcome | mutate/reject approved submission `409` |

## SM-05 — Earning

Lifecycle: `Pending -> Confirmed -> Available -> Paid`; correction is linked `Reversed`/adjustment entry, never overwrite/delete history.

| From -> To | Actor; command/event | Guard | Side effect + audit | Idempotency / invalid action |
|---|---|---|---|---|
| none -> Pending | Financialization; `FinancializeApprovedContent` | unique approved source; tax/FX/terms snapshots resolvable | create Gross/Tax/Net and balanced pending journal | unique source business key; replay returns earning |
| Pending -> Confirmed | Local Finance; `ApproveReconciliationLine` | same country/currency; line approved; no anomaly | link batch line; balanced reclass journal | line/source unique; repeated approval no-op |
| Confirmed -> Available | Local Finance; `LockBatch` event | batch lock succeeds; eligibility date reached | balanced available journal | batch lock idempotent; direct command on earning forbidden |
| Available -> Paid | Payout settlement; `PayoutSucceeded` | reserved amount and terminal provider success | linked payout journal; preserve source | provider event unique; duplicate callback no-op |
| Any financial state -> Reversed | Finance/provider; `CreateAdjustment` | reason + linked source; authorization | append adjustment/reversal, never mutate original | unique external event/key; amount beyond policy `422` |

## SM-06 — Reconciliation Batch

Lifecycle: `Draft -> Reviewing -> Approved -> Locked -> Exported`.

| From -> To | Actor; command/event | Guard | Side effect + audit | Idempotency / invalid action |
|---|---|---|---|---|
| none -> Draft | Local Finance; `CreateBatch` | same country/currency/period; MFA | create empty/import batch | period+key unique |
| Draft -> Reviewing | Local Finance; `SubmitBatchReview` | >=1 valid line; totals calculate | freeze import version, flag anomalies | bad currency/source `422` |
| Reviewing -> Reviewing | Local Finance; `ResolveLine/ApproveLine` | anomaly evidence; row current | append line decisions; eligible earning Confirmed | stale line `409`; Ops cannot approve `403` |
| Reviewing -> Approved | Local Finance; `ApproveBatch` | all blocking anomalies resolved; totals balanced | batch approval record | repeat no-op |
| Approved -> Locked | Local Finance; `LockBatch` | MFA; balance invariant; confirmation | immutable lock; Confirmed eligible earnings -> Available | one lock journal per batch; edit/unlock denied `409` |
| Locked -> Exported | Local Finance; `ExportBatch` | scoped export permission | generate redacted CSV evidence | same export parameters may return existing artifact |

## SM-07 — Payout Intent + Request + Attempt

Intent: `OtpPending -> Verified` hoặc `Expired/AttemptsExceeded`. Request: `Reserved -> Queued -> Processing -> Paid | FailedFinal | Unknown`; Attempt là append-only history.

| From -> To | Actor; command/event | Guard | Side effect + audit | Idempotency / invalid action |
|---|---|---|---|---|
| none -> OtpPending | Creator; `StartPayoutIntent` | own profile; amount >= minimum; Available sufficient | send mock/provider OTP metadata, never log OTP | key creates one intent; rate/attempt limit |
| OtpPending -> Verified | Creator; `VerifyOtp` | correct, unexpired, attempts remaining | mark verified | replay safe; wrong OTP no reserve, audit redacted |
| OtpPending -> Expired/AttemptsExceeded | System; expiry/failed verification | timer/limit reached | close intent, no money effect | terminal intent cannot verify |
| Verified -> Reserved | Creator; `CreatePayoutRequest` | intent unused; balance current; bank valid | reserve Available -> Reserved exactly once | request key unique; duplicate returns same request |
| Reserved -> Queued -> Processing | Worker; `DispatchPayout` | provider adapter enabled; attempt key new | append attempt/provider request | retry creates new attempt only after terminal failure |
| Processing -> Paid | Provider/Reconciler; `PaymentSucceeded` | verified provider event + amount/currency match | Reserved -> Paid exactly once | external event unique; duplicate success no-op |
| Processing -> FailedFinal | Provider/Reconciler; `PrePaymentFailed` | confirmed terminal non-payment | release Reserved -> Available exactly once | release journal unique; duplicate failure no-op |
| Processing -> Unknown | Worker; timeout/ambiguous response | no terminal result | hold reserve; enqueue reconciliation | retry/release denied while Unknown |
| Unknown -> Paid/FailedFinal | Reconciler; `ResolvePayout` | authoritative terminal provider lookup | pay once or release once | resolution key/event unique; contradictory terminal result escalates |
| Paid -> linked Reversal | Provider/Finance; `RefundSucceeded` | authoritative post-success refund | append reversal/adjustment; Paid history remains | refund event unique; never set request back to Available |

## Gate G3 invalid-transition checklist

- Local Ops VN direct ID PH: `404 COUNTRY_RESOURCE_NOT_FOUND`, audit denied outcome.
- Local Finance approve KYC/content: `403 ACTION_FORBIDDEN`.
- Creator edit accepted KYC field or approved content: `409 IMMUTABLE_STATE`.
- Join Draft/Paused/Closed/Ended/Full-derived campaign: `422 CAMPAIGN_NOT_JOINABLE` with reason.
- Edit/Unlock Locked batch: `409 BATCH_LOCKED`; correction uses adjustment.
- Retry/release payout Unknown: `409 PAYOUT_RESULT_UNKNOWN`; only reconcile available.
- Duplicate approve/lock/provider event: existing result/no new money effect.

