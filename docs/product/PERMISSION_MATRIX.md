# Permission matrix — role × action × country × state

> Gate G3, version `v0.1`. `A` allow, `C` conditional, `D` deny. Deny-by-default cho action không liệt kê. UI visibility không thay thế API authorization.

## Role scope

| Role | Country scope | Step-up auth | Data ownership |
|---|---|---|---|
| Creator | active own country profile | OTP cho payout | own profile/KYC/participation/content/earning/payout |
| Local Ops | assigned country only | session; policy may require MFA | KYC/content queues in assigned country |
| Local Finance | assigned country only | MFA required | reconciliation/payout in assigned country |
| Local Admin | assigned country only | session; sensitive config may require MFA | config/campaign/role view in assigned country |
| Global Admin | explicit authorized countries; bypass permission separate | MFA required | cross-country only per permission + reason + audit |

## Action matrix

| Action / valid state | Creator | Local Ops | Local Finance | Local Admin | Global Admin | Country/API enforcement |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Read own country profile/KYC | A | C | D | C | C | Creator owner; staff same country; PII field permission |
| Edit profile / rejected KYC field | A | D | D | D | D | own active profile; only NeedsChanges fields |
| Submit/resubmit KYC | A | D | D | D | D | Draft/NeedsChanges, same profile country |
| Review KYC field/case | D | A | D | D | C | InReview; Ops same country; Global explicit compliance permission |
| Browse active campaigns | A | C | D | A | C | route country; public fields only |
| Build/edit Draft campaign | D | C | D | A | C | Ops only if `campaign:write`; same country; Draft |
| Activate/pause/close campaign | D | C | D | A | C | state guard; cross-country bypass reason for Global |
| Join campaign | A | D | D | D | D | own Approved KYC; Active; eligibility/cap transaction |
| Submit/resubmit own content | A | D | D | D | D | Active participation; current version rules |
| Review/reject/approve content | D | A | D | D | C | same country; active InReview version |
| Read own earning/payout | A | D | C | D | C | owner or scoped finance; Global explicit finance-read |
| Create payout + verify OTP | A | D | D | D | D | own profile; balance/minimum/OTP guards |
| Build/review reconciliation batch | D | D | A | D | C | same country/currency; MFA |
| Approve line / approve batch | D | D | A | D | C | Reviewing; separation/audit policy |
| Lock Approved batch | D | D | A | D | C | MFA, balanced totals; one lock effect |
| Edit/unlock Locked batch | D | D | D | D | D | correction only by linked adjustment |
| Dispatch/reconcile payout | D | D | A | D | C | scoped finance; Unknown only reconcile |
| Retry payout after FailedFinal | A | D | C | D | C | new intent/attempt; never overwrite attempt |
| Retry/release payout Unknown | D | D | D | D | D | authoritative terminal reconcile required |
| Create linked adjustment/reversal | D | D | C | D | C | finance permission, reason, source link, MFA |
| Read scoped audit | own timeline | C | C | A | C | least privilege + redaction; same country unless bypass |
| Export scoped queue/batch/audit | D | C | A | C | C | country-filtered query/export; audit export action |
| Change country config | D | D | D | A | C | versioned config; Global bypass reason if other country |
| Assign local roles | D | D | D | C | A | cannot grant outside actor delegation scope |

## Mandatory negative cases

| Case | UI | API result | Audit |
|---|---|---|---|
| VN Ops opens PH KYC/content direct ID | no PH row/action | `404 COUNTRY_RESOURCE_NOT_FOUND` | actor VN, target hash, denied; no PH PII |
| Local Finance tries approve KYC/content | CTA absent | `403 ACTION_FORBIDDEN` | denied role/action |
| Local Admin tries edit Locked batch | Edit/Unlock absent; Adjustment link only if separately granted | `409 BATCH_LOCKED` | denied state transition |
| Global Admin crosses VN -> PH without bypass | country disabled | `403 COUNTRY_BYPASS_REQUIRED` | source/target + denied outcome |
| Global Admin crosses with bypass | reason modal + MFA | allow only explicit permission | actor, source/target, reason, before/after |
| Body says VN while route/session context PH | body field ignored/rejected | `400 COUNTRY_BODY_FORBIDDEN` or route-authorized PH | tamper attempt without leaking rows |

## Enforcement order

```text
authenticate -> MFA/step-up -> resolve route market -> authorize role/country
-> load aggregate through scoped repository/RLS -> check state/version/owner
-> execute idempotently -> append audit outcome -> return redacted DTO
```

