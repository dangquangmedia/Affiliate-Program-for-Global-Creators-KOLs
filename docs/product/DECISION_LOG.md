# Product and architecture Decision Log

> Baseline: 2026-07-17  
> Status convention: `FROZEN_DEFAULT` means dùng recommendation đã timebox để không chặn thiết kế; mentor/owner có thể ratify hoặc thay bằng decision mới, không sửa mất lịch sử.

| ID | Decision | Status | Rationale | Impact / invariant | Approver | Review date |
|---|---|---|---|---|---|---|
| DEC-01 | Core P0 reward là `CONTENT_APPROVED + CONTENT_FLAT`; mỗi rewarded deliverable tạo đúng một Pending Earning. CPS là P0b | FROZEN_DEFAULT | Giữ E2E trong 5 tuần nhưng model vẫn mở rộng | Duplicate approve không double money; G20/G25 không phụ thuộc CPS | Acting Product Owner | 2026-07-20 |
| DEC-02 | Creator được xem campaign trước KYC; chỉ join khi country profile + KYC `Approved` | FROZEN_DEFAULT | Discovery không bị khóa, action có rủi ro được gate | Join API enforce eligibility; UI-only guard không đủ | Product/Compliance | 2026-07-20 |
| DEC-03 | Earning lifecycle `Pending → Confirmed → Available → Paid`; reversal bằng linked adjustment | FROZEN_DEFAULT | Auditability và không mất lịch sử | Không xóa/overwrite record tài chính | Product/Finance | 2026-07-20 |
| DEC-04 | Finance approve reconciliation line tạo `Confirmed`; lock batch mới chuyển eligible amount `Available` | FROZEN_DEFAULT | Tách review khỏi availability | Lock idempotent, batch locked immutable | Finance Owner | 2026-07-20 |
| DEC-05 | Payout reserve once; confirmed pre-payment failure release once; `UNKNOWN` giữ reserve; post-success refund tạo reversal; retry tạo attempt mới sau terminal resolution | FROZEN_DEFAULT | Ngăn double-pay/double-release khi provider mơ hồ | Retry bị chặn khi UNKNOWN; callback idempotent | Finance/Security | 2026-07-20 |
| DEC-06 | Terms/commission snapshot tại join; thay đổi Offer không sửa participation cũ | FROZEN_DEFAULT | Earning tái lập theo điều kiện creator đã chấp nhận | Snapshot immutable/versioned | Product/Finance | 2026-07-20 |
| DEC-07 | Route là market intent; server đối chiếu session/role; không tin `country_id` từ body | FROZEN_DEFAULT | Chống country tampering | Mọi query/list/count/export/storage dùng authorized context | Security/Architect | 2026-07-20 |
| DEC-08 | Một Next.js app với role-based shell cho MVP | FROZEN_DEFAULT | Một developer, giảm duplicate UI/tooling | Creator/Ops/Finance/Admin tách permission, không cần bốn app | Architect | 2026-07-20 |
| DEC-09 | Auth qua provider adapter; Google thật nếu credential sẵn; local/mock adapter luôn có và phải disclose | FROZEN_DEFAULT | Không để credential chặn sprint, không đánh tráo mock thành real SSO | CR-01 chỉ final DONE bằng provider thật hoặc owner waiver ký | Product/Security | 2026-07-20 |
| DEC-10 | Mock OTP/MFA có expiry, attempt limit và audit | FROZEN_DEFAULT | Test được security flow thay vì OTP cố định | Finance/Global Admin bắt buộc MFA; log không chứa OTP | Security | 2026-07-20 |
| DEC-11 | Tax/FX dùng versioned synthetic config + fixed seed, ghi `demo only` | FROZEN_DEFAULT | Tránh khẳng định compliance, vẫn test được money | Snapshot rule/rate/rounding; local payout là chính | Finance/Product | 2026-07-20 |
| DEC-12 | `pnpm workspace`; Node exact `24.11.1`; pin package/lockfile | FROZEN_DEFAULT | Đồng nhất monorepo và reproducibility | Không trộn npm/yarn; pnpm provision Ngày 2 | Platform | 2026-07-20 |
| DEC-13 | Prisma Migrate là ORM/migration duy nhất trong sprint | FROZEN_DEFAULT | Hợp NestJS/TypeScript, migration history rõ | Không đổi ORM giữa sprint; release không dùng db push | Architect/Backend | 2026-07-20 |
| DEC-14 | Figma low-fi; fallback HTML wireframe nếu Figma không sẵn sàng trước Ngày 2 | FROZEN_DEFAULT | Ưu tiên logic/state và clickable evidence | Không để tool access chặn G2/G3 | Product/UX | 2026-07-20 |
| DEC-15 | Campaign `Full` là derived eligibility từ slot/budget, không phải lifecycle state | FROZEN_DEFAULT | Tránh invalid transitions và race condition | Lifecycle vẫn Draft/Active/Paused/Closed; capacity check transactional | Product/Backend | 2026-07-20 |
| DEC-16 | Global Admin chỉ bypass country scope qua permission rõ; mọi cross-country action bắt buộc audit | FROZEN_DEFAULT | Cần vận hành global nhưng không tạo superuser mù | Deny-by-default; actor/reason/target countries trong audit | Security/Product | 2026-07-20 |

## Tooling decisions hỗ trợ scaffold

- Package manager/runtime/topology/ORM/OAuth/mockup đã khóa; xem `docs/engineering/TOOLCHAIN.md`.
- pnpm chưa có trên máy hiện tại; đây là provisioning task Ngày 2, không phải tool-choice blocker.
- Không viết KYC/campaign/money business logic trước G4.

## Critical decision check cho G1

- Reward, KYC gate, earning lifecycle, reconciliation, payout recovery, terms snapshot, country source of truth và idempotency: không có decision `OPEN`.
- Các default được phép theo kế hoạch khi mentor chưa phản hồi trong timebox.
- Mọi thay đổi sau freeze phải thêm entry mới/supersede; không sửa ngược rationale cũ.

