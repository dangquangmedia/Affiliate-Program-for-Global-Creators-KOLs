# KẾ HOẠCH TRIỂN KHAI CHI TIẾT TUẦN 1

> Dự án: Affiliate GLOBAL  
> Thời lượng: 5 ngày làm việc, khoảng 40 giờ  
> Nguồn phạm vi: `Plan/docs/Book1.xlsx` và `Plan/KE_HOACH_TRIEN_KHAI_5_TUAN.md`  
> Trạng thái khi lập kế hoạch: Pre-implementation, chưa bắt đầu Ngày 1  
> Mục tiêu tuần: khóa sản phẩm và mockup trước, sau đó dựng walking skeleton Web → API → PostgreSQL

## 1. Kết quả bắt buộc cuối Tuần 1

Tuần 1 không nhằm hoàn thành các chức năng affiliate nghiệp vụ. Tuần này phải tạo ra một nền móng đủ rõ để từ Tuần 2 không phải đoán lại flow, quyền, trạng thái hoặc dữ liệu.

Cuối Tuần 1 phải chứng minh được năm kết quả:

1. **Scope đã khóa:** 22 Must có Requirement Traceability Matrix; P0, P0b, P1 và out-of-scope không còn lẫn nhau.
2. **Product mockup đã khóa:** bốn primary scenario đi được bằng low-fi clickable prototype; 12 view lõi bao phủ Creator, Ops, Finance và Admin.
3. **Business rules đã khóa:** reward trigger, KYC gate, state machine, permission, country context, money và payout failure recovery không còn mơ hồ.
4. **Architecture đã khóa:** Product, Offer và Campaign tách riêng; global identity tách country profile; ERD, API contract, country-isolation strategy và ADR đủ để triển khai Tuần 2.
5. **Walking skeleton chạy được:** một lệnh dựng Web, API và PostgreSQL; `/health`, `/vn` và `/ph` hoạt động qua một DB → API → UI round-trip thật.

Kết quả mong đợi cuối tuần là **design-ready + runnable skeleton**, không được báo cáo là đã hoàn thành CP-02, Auth, KYC, Campaign, Ledger hoặc Payout.

## 2. Giả định nguồn lực và kỷ luật thực thi

- Một full-stack developer làm chính, đổi “mũ vai trò” theo task: Product Owner, BA, UX, Domain/Security, Architect, Platform và QA.
- Mentor/Product Owner duyệt vào cuối Ngày 1, Ngày 3 và Ngày 5. Nếu không nhận phản hồi đúng timebox, dùng default recommendation trong Decision Log để freeze tạm và ghi rõ người cần xác nhận sau.
- Mỗi ngày tối đa 7 giờ công việc đã lên lịch và giữ khoảng 1 giờ buffer cho review, integration hoặc sự cố môi trường.
- Giới hạn WIP: một đầu việc lớn đang làm; không mở nhiều artifact dang dở cùng lúc.
- Chỉ bootstrap tooling trước Architecture Gate; không viết business logic KYC/campaign/money trước khi ERD, state và permission được khóa.
- Mockup ưu tiên low-fi, logic và trạng thái. Hi-fi, animation và visual polish không phải P0 của Tuần 1.
- Mọi đầu ra phải tồn tại dưới dạng file, prototype URL hoặc command evidence; nội dung chỉ có trong chat không được tính là hoàn thành.
- `Plan/00_PROJECT_EXECUTION_LOG.md` là tài liệu continuity nội bộ, phải giữ ngoài staging/publish trừ khi người dùng đổi chính sách.

## 3. Thứ tự ưu tiên tuyệt đối

| Thứ tự | Nhóm việc | Mức | Lý do phải làm trước |
|---:|---|---|---|
| 1 | Git, toolchain, chính sách secrets và evidence | P0 | Không để artifact Tuần 1 tồn tại mà không có baseline hoặc vô tình publish file nội bộ |
| 2 | Xác nhận scope 22 Must và các quyết định nghiệp vụ | P0 | Mọi mockup, state và ERD đều phụ thuộc vào reward/KYC/payout rule |
| 3 | Bốn primary demo scenario | P0 | Dùng làm xương sống để đánh giá mọi màn hình, API và test sau này |
| 4 | Creator journey và low-fi mockup | P0 | Creator flow là đầu vào cho Ops/Finance flow và screen-to-data contract |
| 5 | Admin/Finance journey | P0 | Khóa điểm giao giữa Creator, Ops, Finance và Admin |
| 6 | State machine và permission matrix | P0 | Ngăn thiết kế happy-path-only, sai quyền hoặc xử lý tiền sai |
| 7 | ERD, invariants và country-isolation contract | P0 | Chặn hard-code category/network và ngăn lẫn dữ liệu VN/PH |
| 8 | API contract cho Tuần 2 và architecture decisions | P0 | Frontend/backend dùng chung contract trước khi triển khai feature |
| 9 | Web → API → PostgreSQL walking skeleton | P0 | Chứng minh stack và cách truyền country context chạy thật |
| 10 | Verify, clean setup, README, demo và handoff | P0 | Chứng minh tuần đã hoàn thành bằng bằng chứng tái lập được |
| 11 | Hi-fi, API Tuần 3–4, worker/Redis/MinIO, remote CI | P1 Tuần 1 | Chỉ làm nếu toàn bộ P0 và Gate G5 đã Green |

Dependency bắt buộc:

```text
G0 Execution baseline
  → G1 Scope và business decision
  → G2 Creator UX
  → G3 Workflow, state và permission
  → G4 Architecture
  → G5 Walking skeleton và Week 1 release gate
```

Phân bổ công suất để kế hoạch không vượt 40 giờ:

| Ngày | Task đã lên lịch | Buffer | Trọng tâm |
|---|---:|---:|---|
| 1 | 7 giờ 30 | 30 phút | Git, RTM, quyết định và demo scenarios |
| 2 | 7 giờ | 1 giờ | Creator mockup và tooling bootstrap |
| 3 | 7 giờ 15 | 45 phút | Admin mockup, state, permission và PostgreSQL bootstrap |
| 4 | 6 giờ 45 | 1 giờ 15 | ERD, API, architecture và migration start |
| 5 | 7 giờ + 1 giờ integration buffer | Đã nằm trong task W1-D5-T06 | Walking skeleton, verify, demo và gate |

Buffer chỉ dùng cho review, sửa integration hoặc blocker của P0; không chuyển thành thời gian làm hi-fi/P1.

## 4. Các quyết định phải khóa trước khi vẽ sâu hoặc code

Các dòng dưới đây phải được ghi vào Decision Log trong Ngày 1. “Default” là phương án dùng khi chưa có phản hồi khác.

| ID | Quyết định | Default recommendation | Deadline |
|---|---|---|---|
| DEC-01 | Reward trigger P0 | Content được Ops approve tạo đúng một `Pending Earning`; mock conversion/CPS là P0b | Ngày 1 |
| DEC-02 | Điều kiện tham gia campaign | Creator được xem campaign trước KYC; chỉ join khi country profile và KYC đã `Approved` | Ngày 1 |
| DEC-03 | Earning lifecycle | `Pending → Confirmed → Available → Paid`; reversal bằng adjustment, không xóa record | Ngày 1 |
| DEC-04 | Reconciliation effect | Finance approve line thành `Confirmed`; lock batch mới chuyển số đủ điều kiện thành `Available` | Ngày 1 |
| DEC-05 | Payout failure/recovery | Request reserve một lần; confirmed pre-payment failure release reserve đúng một lần; timeout/UNKNOWN giữ reserve; post-success refund là linked reversal; business retry tạo attempt mới sau terminal resolution | Ngày 1 |
| DEC-06 | Terms/commission | Snapshot tại thời điểm join; thay đổi Offer sau đó không sửa snapshot cũ | Ngày 1 |
| DEC-07 | Country source of truth | Route xác định market; server đối chiếu session/role; không tin `country_id` từ request body | Ngày 1 |
| DEC-08 | App topology | Một Next.js app với role-based shell cho MVP | Ngày 1 |
| DEC-09 | OAuth | Google thật nếu credential sẵn; luôn có local/mock adapter để không chặn Tuần 2 | Ngày 1 |
| DEC-10 | MFA/OTP | Mock provider có expiry, attempt limit và audit | Ngày 1 |
| DEC-11 | Tax/FX demo | Config synthetic theo country, fixed seed, ghi rõ “demo only” | Ngày 1 |
| DEC-12 | Package manager | `pnpm workspace`; khóa runtime/tool versions vào repo | Ngày 1 |
| DEC-13 | ORM/migration | Chọn đúng một công cụ phù hợp năng lực team; không thay giữa sprint | Ngày 1 |
| DEC-14 | Mockup | Figma low-fi; fallback HTML wireframe nếu workspace Figma không sẵn sàng | Trước Ngày 2 |
| DEC-15 | Campaign full | `Full` là eligibility/derived status từ slot hoặc budget, không phải lifecycle state độc lập | Ngày 3 |
| DEC-16 | Global Admin bypass | Chỉ bypass country scope theo permission rõ; mọi cross-country action bắt buộc audit | Ngày 3 |

Nếu một quyết định ảnh hưởng reward, country isolation, money hoặc idempotency còn `OPEN` sau Gate G1 thì Ngày 2 không được chuyển sang vẽ chi tiết.

Canonical reward glossary phải dùng xuyên Tuần 1–5:

~~~text
CONTENT_APPROVED + CONTENT_FLAT = core P0 reward
PAID_ORDER + SALE_PERCENT       = business label CPS, chỉ P0b nếu G17 Green
QUALIFIED_LEAD + LEAD_FLAT      = modeled-only trong Phase 1
APP_INSTALL + INSTALL_FLAT      = modeled-only trong Phase 1
SUBSCRIPTION + RECURRING_*      = modeled-only trong Phase 1
~~~

`CPS` là business label, không phải tên enum strategy. Với `CONTENT_FLAT`, mỗi participation có một rewarded content deliverable; conversion P0b nếu có dùng source business key riêng, không dùng deliverable uniqueness để chặn nhiều conversion hợp lệ trong tương lai.

## 5. Danh mục artifact phải tạo

Đường dẫn có thể điều chỉnh khi khởi tạo repo, nhưng không được bỏ artifact.

| Artifact | Đường dẫn dự kiến | Ngày tạo | Người duyệt | Mức |
|---|---|---:|---|---|
| MVP scope | `docs/product/MVP_SCOPE.md` | 1 | Product/Mentor | P0 |
| Glossary | `docs/product/GLOSSARY.md` | 1 | Product | P0 |
| Requirement Traceability Matrix | `docs/product/RTM.md` | 1, cập nhật 2–5 | Product + QA | P0 |
| Decision Log | `docs/product/DECISION_LOG.md` | 1, cập nhật xuyên tuần | Product + Architect | P0 |
| Four demo scenarios | `docs/product/DEMO_SCENARIOS.md` | 1 | Product + QA | P0 |
| Creator/Admin journey | `docs/product/USER_FLOWS.md` | 2–3 | Product | P0 |
| Screen inventory | `docs/product/SCREEN_INVENTORY.md` | 2–3 | Product + UX | P0 |
| Clickable prototype | Figma URL + snapshot/export trong `docs/product/mockup/` | 2–3 | Product/Mentor | P0 |
| State machines | `docs/product/STATE_MACHINES.md` | 3 | Product + Backend | P0 |
| Permission matrix | `docs/product/PERMISSION_MATRIX.md` | 3 | Security/Product | P0 |
| Provider failure matrix | `docs/product/PROVIDER_FAILURE_MATRIX.md` | 3 | Product + QA | P0 |
| ERD v1 | `docs/architecture/ERD.md` | 4 | Architect | P0 |
| API contract | `docs/architecture/API_CONTRACT.md` hoặc OpenAPI skeleton | 4 | Frontend + Backend | P0 |
| Architecture diagram | `docs/architecture/ARCHITECTURE.md` | 4 | Architect | P0 |
| ADRs | `docs/architecture/adr/` | 4 | Architect | P0 |
| Test strategy/evidence | `docs/qa/TEST_STRATEGY.md`, `docs/qa/WEEK1_EVIDENCE.md` | 4–5 | QA | P0 |
| Setup guide | `README.md` | 5 | Platform | P0 |

ADR tối thiểu:

1. Modular monolith và app topology.
2. Global identity + country isolation + RLS strategy.
3. Product → Offer → Campaign canonical model.
4. Money, ledger, snapshot và immutability.
5. Provider adapter/mock strategy.

## 6. Kế hoạch chi tiết theo ngày

### Ngày 1 — Execution baseline, scope và business decisions

#### Outcome duy nhất

Biến scope đã phân tích từ Book1 thành backlog có thể thiết kế và kiểm thử; không phân tích lại dự án từ đầu.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W1-D1-T01 | 45 phút | Platform | Khởi tạo Git hợp lệ; chốt default branch; local-exclude execution log; tạo secrets policy và baseline | Git baseline | `git rev-parse`/`git status` pass; `Plan/00_PROJECT_EXECUTION_LOG.md` không staged và có ignore evidence |
| W1-D1-T02 | 45 phút | Platform/Architect | Chốt package manager, runtime version policy, ORM/migration, app topology, OAuth fallback và mockup tool | Tooling decisions trong Decision Log | Không còn tool choice nào chặn scaffold |
| W1-D1-T03 | 1 giờ 45 | Product/BA | Chuyển 22 Must thành RTM baseline; tách 7 Should; ghi actor, country, outcome, dependency | `RTM.md` v0.1 | Đủ đúng 22 Must; không đưa P1/out-of-scope vào cam kết P0 |
| W1-D1-T04 | 1 giờ 30 | Product/Domain | Khóa DEC-01 đến DEC-16, ưu tiên reward, KYC, earning, reconciliation, payout, country | `DECISION_LOG.md` | Mỗi quyết định có status, rationale, impact, approver và ngày review |
| W1-D1-T05 | 1 giờ 30 | Product/QA | Viết bốn demo scenario với precondition, steps, state, money effect, negative assertion và Must IDs | `DEMO_SCENARIOS.md` | Bốn flow dùng được làm acceptance backbone; P0b không chặn scenario chính |
| W1-D1-T06 | 45 phút | Product/UX | Tạo journey outline, state inventory và screen inventory sơ bộ | `USER_FLOWS.md`, `SCREEN_INVENTORY.md` v0.1 | Biết view nào phải vẽ Ngày 2–3; không vượt hard cap 12 view lõi |
| W1-D1-T07 | 30 phút | Product/Mentor | Review Gate G1 và cập nhật execution log | G1 checklist | Không còn business decision critical ở trạng thái OPEN |

Giữ 30–60 phút buffer cho phản hồi mentor hoặc sửa RTM.

#### RTM baseline bắt buộc có các cột

- Requirement ID theo Book1.
- Priority: P0/P0b/P1.
- Business actor và acceptance owner.
- Country scope.
- Business outcome.
- Preconditions.
- Happy-path acceptance.
- Critical negative/edge acceptance.
- State transition liên quan.
- UI/API/DB dự kiến.
- Test type và demo scenario ID.
- Evidence dự kiến.
- Dependency, risk, status.

#### Gate G1 — Scope Gate

Pass khi:

- 22/22 Must có dòng RTM và business outcome.
- P0/P0b/P1/out-of-scope khớp execution log.
- Flat approved-content reward là core path; CPS không nằm trên critical path.
- KYC gate, earning lifecycle, payout confirmed-failure release/UNKNOWN/post-success reversal và country source of truth đã chốt.
- Bốn demo scenario có expected state và money effect.
- Không còn quyết định nào có thể buộc vẽ lại Creator journey.

Nếu fail: dùng buffer cuối Ngày 1 hoặc đầu Ngày 2; không vẽ wireframe chi tiết trên assumption chưa ghi nhận.

### Ngày 2 — Creator journey và product mockup P0

#### Outcome duy nhất

Creator luôn hiểu: đang ở country nào, cần làm gì tiếp theo, có đủ điều kiện không, content đang ở đâu và tiền đến từ đâu.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W1-D2-T01 | 30 phút | Product/UX | Khóa Creator information architecture và navigation | IA + flow map | Trace được CR-01 đến CR-08; country context luôn nhìn thấy |
| W1-D2-T02 | 2 giờ 15 | UX/Product | Vẽ low-fi happy path cho 8 Creator view lõi | Figma frames v0.1 | Mỗi view có mục tiêu, dữ liệu chính, primary CTA và enable/disable condition |
| W1-D2-T03 | 1 giờ 30 | UX/QA | Thêm state variants và recovery action | State variants | Không chỉ có happy path; lỗi quan trọng có CTA phục hồi rõ |
| W1-D2-T04 | 1 giờ 15 | UX/Product | Nối clickable Scenario 1 và 2 bằng shared frames | Prototype v0.2 | Không dead end; chuyển VN/PH không làm lẫn profile context |
| W1-D2-T05 | 45 phút | Product/BA | Ghi screen-to-data contract: field đọc/ghi, permission, state, audit | Screen inventory v0.2 | Mỗi CTA quan trọng truy được tới command/state cần thiết |
| W1-D2-T06 | 30 phút | Platform | Bootstrap workspace/config tối thiểu, chưa viết business logic | Tooling skeleton | Workspace scripts chạy; không tạo schema nghiệp vụ trước G4 |
| W1-D2-T07 | 15 phút | Product/Mentor | Review Gate G2 và cập nhật RTM/log | G2 checklist | CR-01–CR-08 không thiếu screen hoặc state |

Giữ khoảng 1 giờ buffer cho prototype review và chỉnh flow.

#### Câu hỏi mỗi Creator view phải trả lời

1. Người dùng đang ở country/profile nào?
2. Trạng thái hiện tại là gì và vì sao?
3. Primary CTA tiếp theo là gì?
4. CTA được phép khi nào; nếu disabled thì giải thích thế nào?
5. Người dùng sẽ được trả theo rule nào, currency nào và khi nào available?
6. Nếu provider timeout/reject hoặc Ops yêu cầu sửa, đường phục hồi là gì?
7. Có dữ liệu nào thuộc profile country khác không?

#### Gate G2 — Creator UX Gate

Pass khi:

- CR-01 đến CR-08 đều map vào ít nhất một view và một scenario.
- Campaign detail hiển thị reward, terms, eligibility, budget/slot status và điều kiện KYC.
- KYC needs-changes chỉ mở đúng field bị từ chối.
- Content rejected có reason và đường resubmit.
- Earnings giải thích Gross, Tax, Net, status và source.
- Payout giải thích available balance, minimum, OTP, processing và failure/retry.
- Local currency là số chính; USD chỉ là tham chiếu.
- Evidence có Figma URL/snapshot, flow map và screen inventory.

### Ngày 3 — Admin/Finance mockup, state machine và permission

#### Outcome duy nhất

Nối Creator flow với Local Ops, Local Finance, Local Admin và Global Admin bằng transition và quyền rõ ràng.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W1-D3-T01 | 30 phút | Product/UX | Khóa Admin/Finance IA và các handoff point từ Creator | Admin flow map | Có country config, campaign, KYC/content review, reconciliation, payout và audit |
| W1-D3-T02 | 1 giờ 30 | UX/Product | Vẽ 4 Admin/Finance view lõi và state variants | Figma frames v0.3 | Queue, workbench, builder và finance view hỗ trợ đúng actor/action |
| W1-D3-T03 | 2 giờ | Domain Designer | Viết state machine cho 7 aggregate | `STATE_MACHINES.md` | Mỗi transition có actor, command/event, guard, side effect, audit, idempotency và invalid action |
| W1-D3-T04 | 1 giờ | Security/Product | Viết permission matrix theo role × action × country × state | `PERMISSION_MATRIX.md` | Allow/deny rõ; UI ẩn action nhưng API vẫn kiểm tra lại |
| W1-D3-T05 | 30 phút | Product/QA | Viết provider failure matrix | `PROVIDER_FAILURE_MATRIX.md` | Có success, validation failure, timeout/unknown, duplicate, retry, confirmed-failure release và post-success reversal/refund |
| W1-D3-T06 | 1 giờ | UX/Product | Nối Scenario 3 và 4 vào prototype | Prototype v0.4 | Creator–Ops–Finance flow đi được mà không cần giải thích miệng |
| W1-D3-T07 | 30 phút | Platform | Bootstrap PostgreSQL Compose và environment contract | Infra skeleton | PostgreSQL health được; secrets không nằm trong repo |
| W1-D3-T08 | 15 phút | Product/Mentor | Review Gate G3 và cập nhật RTM/log | G3 checklist | State và permission không mâu thuẫn |

Giữ khoảng 45 phút buffer.

#### Bảy state machine bắt buộc

| Aggregate | State tối thiểu phải xem xét | Invariant trọng yếu |
|---|---|---|
| KYC Case + Field | Draft, Submitted, In Review, Needs Changes, Resubmitted, Approved, Rejected | Creator chỉ sửa field needs-changes; quyết định cũ không bị mất |
| Campaign | Draft, Active, Paused, Closed/Ended | Draft/paused/ended không join; `Full` là derived eligibility |
| Participation | Joined, Active, Suspended, Completed, Cancelled | Join idempotent; terms/commission snapshot một lần |
| Content Submission | Draft, Submitted, In Review, Rejected/Needs Changes, Resubmitted, Approved | Re-approve không tạo earning thứ hai; reject có reason |
| Earning | Pending, Confirmed, Available, Paid, Reversed | Không update đè lịch sử; adjustment liên kết source |
| Reconciliation Batch | Draft, Reviewing, Approved, Locked, Exported | Locked không quay lại editable; sửa bằng adjustment |
| Payout Intent + Request + Attempt | Intent: OTP Pending/Verified/Expired; Request: Reserved/Queued/Processing/Paid/Failed Final/Unknown; Attempt giữ history | Reserve/release đúng một lần; Unknown giữ reserve; post-success refund là linked reversal; retry không overwrite attempt |

#### Permission cases phải có trong matrix

- Creator chỉ đọc/sửa profile, KYC, content, earning và payout của chính mình trong country context hiện tại.
- Local Ops VN mở KYC/content PH bằng direct ID phải nhận 403/404 theo policy đã chốt.
- Local Finance không approve KYC/content và không sửa campaign brief.
- Local Admin quản lý campaign/config trong country, không sửa locked reconciliation batch.
- Global Admin chỉ cross-country theo permission rõ và mọi action đều audit.
- Frontend không hiển thị CTA trái quyền; backend vẫn là nơi quyết định cuối.

#### Gate G3 — Workflow Gate

Pass khi:

- Approve, reject, lock, payout và cross-country action đều có actor/audit.
- Invalid transition có expected error, không chỉ ghi transition hợp lệ.
- Timeout/unknown có recovery path.
- Confirmed failure release reserve đúng một lần; Unknown giữ reserve; post-success refund dùng linked reversal; retry không ghi đè attempt cũ.
- Locked batch không có action sửa trực tiếp trong mockup.
- Terms/commission snapshot lúc join xuất hiện trong state/data contract.
- Bốn scenario đều click được qua frame dùng chung.

### Ngày 4 — ERD, API contract và architecture freeze

#### Outcome duy nhất

Chuyển mockup, state và permission thành contract kỹ thuật đủ để bắt đầu implementation có kiểm soát.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W1-D4-T01 | 2 giờ | Data Architect | Thiết kế ERD theo các domain identity/country, affiliate, review, finance và audit | ERD v1 | Cardinality/ownership rõ; Product–Offer–Campaign và user–country profile tách riêng |
| W1-D4-T02 | 30 phút | Domain/Data | Ghi invariants, unique constraints, money type và migration order | Data rules | Không dùng float; idempotency/snapshot/immutability có constraint/strategy |
| W1-D4-T03 | 1 giờ | API Architect | Thiết kế API convention và contract tối thiểu cho Tuần 2 | OpenAPI/API contract v1 | Country mismatch, error envelope, enum, decimal money, UTC time, pagination/idempotency rõ |
| W1-D4-T04 | 45 phút | Security Architect | Chốt route/session/API/DB country contract, RLS strategy và negative-test plan | Security section/ADR | Không tin country body; local query luôn có country scope; bypass có audit |
| W1-D4-T05 | 45 phút | Architect | Vẽ modular-monolith architecture và viết ADR | Architecture v1 | Module boundary và provider adapter rõ; không thiết kế microservices |
| W1-D4-T06 | 30 phút | Product/QA | Trace 22 Must qua screen, state, API/entity và evidence | RTM v0.3 | Không còn Must thiếu design/test strategy |
| W1-D4-T07 | 1 giờ | Backend/Data | Khởi tạo schema/migration/seed framework sau khi G4 design review pass | DB skeleton | Migration từ DB rỗng; seed plan VN/PH deterministic |
| W1-D4-T08 | 15 phút | Architect/Mentor | Review Gate G4 và ghi exception có owner/deadline | G4 checklist | Không còn architecture blocker cho Ngày 5/Tuần 2 |

Giữ khoảng 1 giờ buffer để sửa ERD/API sau review.

#### Entity/domain tối thiểu trong ERD

- Identity: User, Identity Provider, Session.
- Country: Country, Country Config, Creator Country Profile, Bank/Tax/Agreement, Role Assignment.
- KYC: KYC Case, KYC Field/Document, Review Decision.
- Affiliate: Product, Offer, Reward Rule, Campaign, Campaign Localization, Participation, Tracking Asset.
- Content: Submission, Submission Version, Review Decision.
- Money: Earning, Ledger Entry, Adjustment/Reversal, FX/Tax/Commission Snapshot.
- Finance: Reconciliation Batch/Line, Payout Request, Payout Attempt.
- Governance: Audit Event, Idempotency/External Event record nếu cần.

#### ERD acceptance bắt buộc

- Mọi entity local nhạy cảm có `country_id`; partner scope có `partner_id` nếu áp dụng.
- Global User không chứa KYC, bank hoặc tax dùng chung toàn cầu.
- Money dùng exact decimal/minor-unit strategy + ISO currency, không dùng floating point.
- Terms, reward, tax và FX có version/snapshot.
- Unique constraint cho join, external event và idempotency key.
- Ledger/batch lock là immutable; correction bằng entry mới.
- Reversal/adjustment liên kết record gốc.
- PII boundary, timestamps UTC và audit ownership được xác định.
- Index strategy ưu tiên country + state + queue + external ID.

#### API contract tối thiểu cho Tuần 2

- Auth/session adapter và local fallback.
- Lấy market context từ `/vn` hoặc `/ph`.
- Tạo/list/switch country profile.
- Lấy country configuration/locale/currency.
- KYC checklist, draft, submit, upload metadata, status.
- Ops KYC queue/detail, approve/reject/request-changes.
- Audit event contract cho command nhạy cảm.
- Convention cho `401`, `403`, `404`, validation và state conflict.

Chưa cần chi tiết toàn bộ API Campaign, Ledger và Payout trong Ngày 4; chỉ cần endpoint inventory và domain boundary để không khóa sai kiến trúc.

#### Gate G4 — Architecture Gate

Pass khi:

- Product, Offer và Campaign là ba entity riêng.
- Global identity và country profile tách riêng.
- Country context thống nhất từ URL → session/token contract → API → DB.
- Money, snapshots, idempotency, audit và immutability được thể hiện.
- API Week 2 đủ để frontend/backend làm việc không đoán field.
- ADR giải thích lựa chọn, trade-off và phần bị hoãn.
- Không còn state/permission mơ hồ buộc sửa ERD lớn.

### Ngày 5 — Walking skeleton, verification và Week 1 gate

#### Outcome duy nhất

Chứng minh kiến trúc có thể chạy lặp lại bằng một vertical slice kỹ thuật nhỏ, chưa phải feature nghiệp vụ.

| Task ID | Timebox | Mũ vai trò | Công việc | Đầu ra | Acceptance/evidence |
|---|---:|---|---|---|---|
| W1-D5-T01 | 1 giờ 15 | Platform/Full-stack | Hoàn thiện monorepo Web/API/shared config và Docker Compose P0 | Runnable workspace | Web, API, PostgreSQL khởi động và có health dependency |
| W1-D5-T02 | 1 giờ | Backend/Data | Chạy migration từ DB rỗng; seed VN/PH; kiểm tra chạy lại | Migration/seed evidence | Lần 1 pass; lần 2 không duplicate hoặc phá dữ liệu |
| W1-D5-T03 | 1 giờ 30 | Full-stack | Tạo market-context round-trip DB → API → UI | `/vn`, `/ph` shell | `/vn` trả VN/vi-VN/VND; `/ph` trả PH/en-PH hoặc fil-PH/PHP từ DB |
| W1-D5-T04 | 1 giờ 15 | QA/Platform | Tạo verify command, health/route/invalid-country smoke và test scaffolds | Test baseline | Lint, type-check, unit/smoke, build pass; invalid country không render market giả |
| W1-D5-T05 | 45 phút | Platform | Viết README setup, env example và clean restart instructions | `README.md` | Người khác có thể dựng skeleton mà không sửa code/DB thủ công |
| W1-D5-T06 | 1 giờ | Full-stack/QA | Integration buffer: sửa Compose, migration, route, test hoặc docs blocker | Green baseline | Không dùng buffer cho hi-fi/P1 |
| W1-D5-T07 | 1 giờ 15 | Product/Architect/Mentor | Demo, chấm GO/CONDITIONAL GO/NO-GO, checkpoint và cập nhật execution log | Week 1 evidence + handoff | Gate G5 được ghi rõ; next exact action là Ngày 6 |

#### Walking skeleton bắt buộc

```text
Browser /vn
  → Web nhận market code từ route
  → GET API market context
  → API đọc Country/CountryConfig từ PostgreSQL
  → trả locale, currency và enabled status
  → Web render “Vietnam / VND”

Browser /ph
  → cùng code path
  → render “Philippines / PHP”
```

Không hard-code hai response khác nhau ngay trong UI. Nếu chưa có DB round-trip, kết quả mới chỉ là scaffold, chưa đạt walking skeleton.

#### Verification evidence tối thiểu

```text
git status --short
git check-ignore -v Plan/00_PROJECT_EXECUTION_LOG.md
docker compose up --build
GET /health -> 200
migration from empty database -> pass
seed run 1 -> pass
seed run 2 -> no duplicate
/vn -> VN context from API/database
/ph -> PH context from API/database
invalid country route -> controlled not-found/redirect
lint -> pass
type-check -> pass
test/smoke -> pass
build -> pass
```

Lệnh cụ thể sẽ được chuẩn hóa theo scripts đã khóa trong repo; không ghi bằng chứng “pass” nếu chưa chạy thật.

## 7. Product mockup — phạm vi phải brainstorm trong Tuần 1

Mockup là contract nghiệp vụ, không chỉ là bản vẽ giao diện. Mỗi frame phải thể hiện country, actor, state, action, rule và recovery.

### 7.1. Hard cap 12 view lõi

Các scenario tái sử dụng view và tạo variants; không biến mỗi trạng thái thành một màn hình hoàn toàn mới.

| View | Người dùng | Chức năng gộp | Requirement chính | State quan trọng |
|---:|---|---|---|---|
| V01 | Creator | Login + chọn/nhận diện market | CR-01, CP-03 | OAuth unavailable, session expired, invalid market |
| V02 | Creator | Country profile + KYC wizard/checklist | CR-02, CR-04 | Draft, needs changes từng field, approved, provider timeout |
| V03 | Creator | Campaign discovery | CR-05 | Loading, empty, filter, eligible/ineligible, full/paused/ended |
| V04 | Creator | Campaign detail + join confirmation | CR-05 | Terms/reward, KYC guard, duplicate join, budget/slot exhausted |
| V05 | Creator | Campaign workspace + tracking asset + submit | CR-06 | URL/hashtag error, duplicate/private content, submit success |
| V06 | Creator | My Campaigns + content status timeline | CR-05, CR-06 | Reviewing, rejected, resubmitted, approved, stale status |
| V07 | Creator | Earnings list/detail | CR-07, CP-06, CP-08 | Pending/confirmed/available/reversed; Gross/Tax/Net |
| V08 | Creator | Wallet + payout request/status | CR-08 | Minimum guard, OTP expired, processing, failed/balance released, unknown/reserved, paid, post-success refunded/reversed |
| V09 | Admin | Role/country shell + country config | CP-01, AD-01 | Role/country context, denied, Global cross-country audited |
| V10 | Ops | Unified review queue + workbench modes | AD-03, AD-04 | KYC/content filter, partial reject, conflict/stale review, bulk partial failure |
| V11 | Local Admin | Product/Offer/Campaign builder | AD-09 | Draft validation, localization, budget, reward, activate/pause/close |
| V12 | Finance | Reconciliation + payout workbench | AD-06, AD-07 | Anomaly, locked batch, FX lock, confirmed-failure release, unknown reconcile, retry, post-success reversal |

Audit trail dùng drawer/tab trong V09–V12; language/currency preference dùng profile/settings panel, không tạo thêm view lõi nếu không cần.

### 7.2. State checklist chung

Mỗi view critical cần cân nhắc:

- Loading/skeleton.
- Empty first-use state.
- Validation error tại field.
- Provider/system error có retry.
- Permission denied.
- Session expired.
- Stale/conflict vì actor khác đã xử lý.
- Success confirmation có next action.
- Mobile Creator và desktop Admin behavior.
- Country, locale và currency context luôn nhìn thấy.

### 7.3. State checklist theo domain

#### KYC

- Draft, Submitted, In Review, Needs Changes, Resubmitted, Approved, terminal Rejected.
- Reject theo field; creator chỉ sửa field được mở.
- Provider timeout/unknown không tự biến thành reject.
- Lịch sử quyết định cũ vẫn nhìn thấy.

#### Campaign

- Eligible và từng lý do ineligible.
- Draft, Active, Paused, Closed/Ended.
- Budget/slot full là trạng thái dẫn xuất.
- Terms, reward, currency, hold condition và required content hiển thị trước Join.
- Duplicate Join trả kết quả idempotent, không báo thành công giả lần hai.

#### Content

- Draft, Submitted, In Review, Needs Changes/Rejected, Resubmitted, Approved.
- URL invalid, platform mismatch, thiếu hashtag/code, duplicate, private/deleted.
- Reject bắt buộc có reason và CTA sửa.
- Ops conflict/stale review khi item đã được người khác xử lý.

#### Earnings/Reconciliation/Payout

- Pending, Confirmed, Available, Paid, Reversed.
- Gross, Tax, Net; local currency chính và USD tham chiếu.
- Anomaly: duplicate, outlier, currency mismatch, missing bank/KYC.
- Locked batch không có edit CTA.
- OTP pending/expired/attempt limit.
- Payout processing, paid, failed final/balance released, unknown/reserved và post-success refunded/reversed; retry có attempt history.

### 7.4. Bốn clickable scenario bắt buộc

#### S01 — VN happy path end-to-end

```text
Login → VN profile → KYC approved
→ discover campaign → xem reward/terms → join
→ nhận tracking asset → submit content → Ops approve
→ Pending Earning → reconciliation locked → Available
→ OTP payout → Paid
```

Acceptance mockup:

- Actor/country rõ ở từng bước.
- Money effect được ghi tại approve, reconcile, lock và payout.
- Mỗi CTA có guard.
- Phần mock/provider và phần business rule thật được gắn nhãn.

#### S02 — PH KYC partial rejection

```text
PH profile → submit KYC
→ Ops PH reject bank field có reason
→ creator chỉ sửa bank field
→ resubmit → approve
```

Acceptance mockup:

- Currency/locale là PH/PHP.
- Field đã approve bị khóa và không mất lịch sử.
- Ops VN không thể mở case PH.

#### S03 — Content reject/resubmit

```text
Creator đã join → submit URL thiếu hashtag
→ Ops reject có reason
→ creator sửa/resubmit
→ Ops approve → tạo đúng một Pending Earning
```

Acceptance mockup:

- Có version/timeline.
- Re-approve/double-click không biểu diễn thêm earning.
- Budget cap và eligibility guard có trạng thái rõ.

#### S04 — Payout failure/unknown recovery và idempotency

```text
Available balance → request payout + OTP
→ reserve balance một lần → provider result
   ├─ confirmed failure → release về Available đúng một lần
   │  → explicit retry/re-reserve bằng attempt mới → Paid
   └─ timeout/UNKNOWN → vẫn giữ reserve → reconcile trước khi retry/release
```

Acceptance mockup:

- Double-click không tạo request thứ hai.
- Confirmed Failed và Unknown khác nhau; Unknown không release/refund vội khi chưa resolve.
- Balance release, post-success refund/reversal và retry có thuật ngữ/timeline/audit riêng.

## 8. Mức độ bao phủ 22 Must trong Tuần 1

Tuần 1 bao phủ **thiết kế/contract** cho toàn bộ Must, nhưng chỉ có runtime skeleton cho một phần CP-01/CP-03.

| Nhóm | Kết quả Tuần 1 | Không được tuyên bố |
|---|---|---|
| CP-01, CP-03 | Market seed + `/vn`, `/ph` round-trip | Country management đầy đủ đã xong |
| CP-02, CP-04 | Country/global identity ERD + security contract | RLS/isolation runtime đã xong |
| CP-05, CP-06, CP-08 | Locale/money/tax/FX design + mockup | i18n/money engine đã xong |
| AD-01, AD-02 | Permission/audit contract | Auth/RBAC/MFA/audit runtime đã xong |
| AD-03, AD-04 | Queue/review mockup + state/API design | Content/KYC review đã xong |
| AD-06, AD-07 | Finance mockup + invariant/API design | Reconciliation/payout đã xong |
| AD-09 | Product/Offer/Campaign builder mockup + ERD | Campaign CRUD/budget đã xong |
| CR-01–CR-08 | Creator journey, states và clickable scenarios | Creator business flow đã chạy thật |

Status RTM cuối tuần nên là `DESIGN_READY`, `SKELETON_VERIFIED` hoặc `PLANNED`; không đổi Must thành `DONE` nếu chưa có implementation/test tương ứng.

## 9. Test baseline và bằng chứng chất lượng

### Bắt buộc trong Tuần 1

- Một lệnh `verify` hoặc tập scripts chuẩn chạy formatter-check, lint, type-check, unit/smoke và build.
- API `/health` integration/smoke pass.
- `/vn`, `/ph` và invalid-country route smoke pass.
- Migration từ DB rỗng pass.
- Seed deterministic có VN/PH; chạy lại không duplicate.
- Test framework cho unit, integration và browser E2E được scaffold.
- Có ít nhất một browser smoke test để không dồn toàn bộ E2E infrastructure sang Tuần 5.
- Synthetic fixtures only; không dùng KYC, bank, token hoặc credential thật.
- Fixed tax/FX/demo clock strategy được ghi trong test strategy.
- Evidence lưu command, result, ngày chạy; không chỉ ghi “đã test”.

### Chưa bắt buộc trong Tuần 1

- Coverage target đầy đủ.
- RLS negative tests cho toàn bộ bảng.
- Auth/KYC E2E.
- Money/ledger invariant tests.
- Load/performance test.

Các phần trên phải có test plan và owner week, nhưng implementation nằm ở Tuần 2–5.

## 10. Gate cuối Tuần 1

### GO

Chỉ chuyển sang Ngày 6 khi toàn bộ điều kiện sau Green:

- [ ] Git repository hợp lệ; secrets policy rõ; execution log nội bộ không staged/publish.
- [ ] 22/22 Must có RTM, acceptance baseline, dependency, test/evidence strategy.
- [ ] P0/P0b/P1/out-of-scope và cut rule đã freeze.
- [ ] Reward trigger, KYC gate, country source of truth, money snapshot và payout recovery đã chốt.
- [ ] Bốn scenario đi được bằng clickable prototype.
- [ ] 12 view lõi có happy path và critical recovery states.
- [ ] State machine có actor, guard, side effect, audit, idempotency và invalid transition.
- [ ] Permission matrix có direct-ID cross-country negative cases.
- [ ] ERD bảo vệ country ownership, PII, money, snapshot, idempotency và immutability.
- [ ] API contract đủ cho Auth/Country/KYC của Tuần 2.
- [ ] Web, API và PostgreSQL chạy bằng setup đã ghi.
- [ ] `/health`, `/vn`, `/ph`, migration, seed, verify và build đều Green.
- [ ] README được kiểm tra qua clean restart.
- [ ] Không còn critical product/architecture decision unresolved.
- [ ] Execution log có evidence và next exact action cho Ngày 6.

### CONDITIONAL GO

Có thể chuyển sang Tuần 2 nếu chỉ còn:

- Minor visual polish hoặc copywriting.
- Translation phụ chưa hoàn chỉnh.
- Product archetype phụ chưa có mockup riêng.
- API chi tiết của Tuần 3–4.
- P0b/CPS design chi tiết.

Mỗi item phải có owner, deadline và không được chặn Auth/Country/KYC.

### NO-GO

Không bắt đầu thêm feature Tuần 2 nếu còn một trong các lỗi:

- Git/setup/migration/seed không tái lập được.
- 22 Must chưa trace đủ.
- Reward trigger hoặc country isolation contract còn mơ hồ.
- Prototype chỉ có happy path hoặc thiếu failure recovery.
- State/permission matrix thiếu critical negative case.
- ERD chưa bảo vệ money, snapshot, idempotency hoặc immutable ledger/batch.
- Web → API → DB market round-trip chưa chạy.
- Verify baseline không Green.

Nếu NO-GO, dùng tối đa nửa ngày đầu Tuần 2 để đóng gate; không âm thầm đẩy nợ xuống Tuần 5.

## 11. P1/Stretch của riêng Tuần 1

Chỉ nhận sau khi G5 đã GO:

1. Hi-fi visual, animation và đầy đủ frame cho mọi state nhỏ.
2. OpenAPI chi tiết cho Campaign, Ledger, Reconciliation và Payout.
3. Generated API client/shared contracts hoàn chỉnh.
4. MinIO, worker và Redis trong Compose.
5. Remote CI/GitHub Actions; P0 chỉ yêu cầu local verify command.
6. `/global` UI shell hoàn chỉnh.
7. Sáu product archetype có mockup chi tiết.
8. P0b mock conversion/CPS **design-only prototype**; không viết execution path hoặc biến nó thành dependency core trong Tuần 1.
9. Architecture diagram và data dictionary polished để trình bày.

## 12. Thứ tự cắt scope nếu trễ

1. Cắt toàn bộ chi tiết P0b mock conversion/CPS.
2. Cắt hi-fi, animation và duplicate frames; giữ low-fi + state matrix.
3. Hoãn worker, Redis, MinIO và provider container.
4. Hoãn remote CI, generated client và `/global` shell.
5. Thu OpenAPI về đúng Auth/Country/KYC của Tuần 2; các module sau chỉ giữ inventory.
6. Chỉ render clickable hai scenario quan trọng nhất nếu thời gian cực hạn; bốn scenario vẫn phải có flow map, state và acceptance đầy đủ.

Không được cắt:

- RTM 22 Must.
- Reward/KYC/payout decisions.
- Country isolation contract.
- State/permission matrix.
- Product–Offer–Campaign ERD.
- Money/idempotency/immutability invariants.
- Bốn scenario specification.
- Web → API → DB walking skeleton.
- Migration/seed/verify/README evidence.

## 13. Risk register Tuần 1

| Risk | Dấu hiệu kích hoạt | Xử lý ngay |
|---|---|---|
| Git chưa hợp lệ | Artifact mới chưa có baseline | Xử lý trước mọi artifact Ngày 1 |
| Mentor phản hồi trễ | Không có review cuối Ngày 1/3 | Timebox; freeze bằng default recommendation và ghi pending confirmation |
| Mockup chỉ đẹp nhưng thiếu logic | Không có denied/error/retry/state | Dùng state checklist và screen-to-data contract làm gate |
| Day 3 quá tải | Trưa Ngày 3 chưa xong Admin IA | Giảm visual frames; giữ state/permission và shared view patterns |
| Day 5 quá tải | Trưa Ngày 5 chưa có DB/API round-trip | Bỏ toàn bộ P1; giữ Web/API/Postgres, health, market route và verify |
| Country contract lệch | URL, token và API nhận market khác nhau | Chốt source of truth + mismatch behavior trong ADR |
| P0b gây scope creep | CPS xuất hiện như dependency core | Dùng flat reward làm scenario chính; P0b là adapter tách rời |
| Provider mock quá lý tưởng | Chỉ có success | Failure matrix bắt buộc từ Ngày 3 |
| Test bị dồn sang Tuần 5 | Cuối Ngày 5 chưa có browser smoke | Scaffold test runner và một smoke test ngay Tuần 1 |
| Dùng dữ liệu thật | Seed/log có PII hoặc credential | Synthetic-only, env example, redaction và secret review |

## 14. Demo cuối Tuần 1

Thời lượng mục tiêu: 12–15 phút.

1. 1 phút: mục tiêu MVP, P0/P0b/P1 và phần mock.
2. 5 phút: click bốn primary scenario, tập trung failure/recovery thay vì visual polish.
3. 2 phút: state machine và permission, minh họa direct-ID cross-country denial.
4. 2 phút: ERD Product → Offer → Campaign, global identity/country profile và money snapshots.
5. 3 phút: chạy walking skeleton; mở `/vn`, `/ph`, gọi `/health` và giải thích DB round-trip.
6. 1–2 phút: evidence, risk, known limitations và kế hoạch Ngày 6.

## 15. Handoff sang Tuần 2 — Ngày 6

Next exact action sau khi G5 GO:

1. Implement Auth/session adapter và local fallback theo API contract.
2. Implement global User và Creator Country Profile.
3. Resolve country context từ route + session; không tin request body.
4. Viết test một user có VN/PH profile độc lập.
5. Giữ toàn bộ KYC/bank/tax dưới country profile.

Trước khi đóng Tuần 1, cập nhật `Plan/00_PROJECT_EXECUTION_LOG.md` với:

- DONE/NOT DONE thực tế.
- Gate result: GO, CONDITIONAL GO hoặc NO-GO.
- Link/path từng artifact.
- Command/test evidence đã chạy.
- Open decision còn lại và owner.
- Next exact action cho Ngày 6.
