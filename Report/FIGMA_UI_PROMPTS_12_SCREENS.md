# Bộ prompt Figma — Affiliate GLOBAL (12 màn, dashboard, responsive)

> Bản chốt sau khi đối chiếu yêu cầu gốc trong đặc tả yêu cầu sản phẩm và
> tài liệu quy trình phát triển, tài liệu product/data model, toàn bộ route UI hiện tại,
> ảnh prototype và UI chạy thật ngày 2026-07-20.

## 1. Cách dùng nhanh

1. Tạo một Figma file mới.
2. Dán **Prompt 00** trước để tạo foundations, variables, component system và app shell.
3. Dán lần lượt **Prompt 01 → Prompt 12**. Mỗi lần yêu cầu AI tái sử dụng component/token đã có.
4. Dán **Prompt 13** để QA toàn bộ file và sửa lỗi responsive/handoff.
5. Nội dung lệnh viết bằng tiếng Anh để Figma AI hiểu ổn định hơn; nội dung UI mặc định là tiếng Việt.

Quy ước: chỉ có đúng **12 product screens**. Modal, drawer, bottom sheet, empty/error/loading và
state khác phải là component variant hoặc overlay, không đánh số thành màn 13, 14.

## 2. Kiến trúc 12 màn đã chốt

| # | Màn | Persona | Job chính |
|---|---|---|---|
| S01 | Sign in & Secure Access | Creator / Staff | SSO, session, staff access/MFA variant |
| S02 | Creator Home & Country Onboarding | Creator | Dashboard tổng quan; tạo/chuyển hồ sơ VN/PH |
| S03 | Country Profile & KYC | Creator | Checklist KYC, sửa đúng field bị reject |
| S04 | Campaign Discovery | Creator | Tìm/lọc campaign đúng country |
| S05 | Campaign Detail & Join | Creator | Hiểu điều khoản, Join/Waitlist, KYC guard |
| S06 | My Campaigns & Content Submission | Creator | Việc cần làm, deadline, submit/resubmit |
| S07 | Earnings Dashboard | Creator | Gross–Tax–Net; Pending/Available/Paid |
| S08 | Wallet & Payout | Creator | Số dư, OTP, payout history và xử lý lỗi |
| S09 | Ops Dashboard & Review Center | Local Ops | Duyệt KYC/content theo country |
| S10 | Campaign Dashboard & Builder | Local Admin | Quản campaign, reward, slots, budget |
| S11 | Finance Dashboard & Workbench | Local Finance | Reconciliation, lock batch, payout/hold |
| S12 | Global Admin Control Center | Global Admin | Country config, flags, audit, role overview |

Lý do tổ chức lại: source hiện có thêm route `My Campaigns` và `Audit`, trong khi bộ 12 màn cũ
không có dashboard thật. S06 gộp My Campaigns + Submit; S12 gộp Country Config + Audit; S02 dùng
hai state First-time/Returning để vừa giữ onboarding vừa có Creator Dashboard.

### Cách đặt frame trên canvas

- Page `00 Foundations`: variables, text/effect styles, icons, component sets, status/state matrix.
- Page `01 Desktop — 1440`: 12 logical frame chia thành 3 swimlane, không xếp thành một hàng dài.
  - Lane A — Onboarding: S01 → S02 → S03.
  - Lane B — Creator lifecycle: S04 → S05 → S06 → S07 → S08.
  - Lane C — Staff control: S09, S10, S11, S12 theo persona; không ngụ ý một staff đi tuần tự cả 4 vai.
- Page `02 Mobile — 390`: 12 responsive variants cùng swimlane/thứ tự; đặt tên `Sxx/Mobile`, kiểm
  thêm constraint ở 375 px. Desktop đặt tên `Sxx/Desktop`; vẫn chỉ là 12 logical screens, 24 artboards.
- Page `03 Prototype & Notes`: flow map, overlays và implementation annotations; không nhân bản
  thêm product screens.

### Prototype flow chính

`S01 → S02 → S03 nếu chưa KYC → S04 → S05 → S06 → S09 duyệt → S07 → S11 lock → S08`

- Campaign hết suất: `S05 → Waitlist state → S06`.
- Content bị reject: `S09 → S06 Resubmit state → S09`.
- Payout: `S08 → S11`; SUCCESS → Paid, FAIL → hoàn balance, UNKNOWN → giữ tiền chờ xử lý.
- Dependency dọc trên flow map: S03 được review ở S09; S06 được review ở S09; S07 được mở tiền
  bởi reconciliation ở S11; payout từ S08 được settle ở S11.

---

## Prompt 00 — Master design system, shells và guardrails

```text
You are a principal product designer creating a production-ready Figma system for “Affiliate GLOBAL”,
a multi-country affiliate/UGC platform for Vietnam and the Philippines. Build foundations and reusable
shells first; do not build flat one-off screens.

PRODUCT MODEL
- Creator flow: sign in → select/create a country profile → complete country-specific KYC → browse
  campaigns → join or enter a FCFS waitlist → submit a social-content URL → Local Ops approves or
  rejects with a reason → earning becomes PENDING → Local Finance locks a reconciliation batch and
  earning becomes AVAILABLE → creator requests payout with OTP → PAID, FAILED_RELEASED, or
  UNKNOWN_HOLD.
- Roles: Creator, Local Ops, Local Finance, Local Admin, Global Admin.
- “Core Platform” is a capability layer across country isolation, routing, i18n, money, tax and RBAC;
  it is not a persona. Do not create a Core Platform dashboard. Do not create a Brand portal in Phase 1.
- Local staff are locked to their assigned country. Global Admin is the only cross-country staff role.
- One global identity can own separate Vietnam and Philippines profiles. Never mix KYC, bank,
  earnings, campaign or payout data between countries.
- Phase-1 reward is CONTENT_APPROVED + FLAT amount per approved content + hard budget cap equal to
  SLOTS × PRICE. Do not invent CPC, CTR, ROAS, click attribution, order conversion or CPS revenue.
- Browsing is open after login; KYC approval is required only when the creator presses Join.
- Join reserves one slot. First submission SLA is 48 hours; rejected content has 24 hours to fix.
  The clock stops while Ops is reviewing. Full campaigns use a FCFS waitlist.
- Money uses integer minor units. Render VND as “500.000 ₫”, PHP as “₱1,200.00”. Local currency is
  always primary; approximate USD is optional and visually secondary with an “≈” label.
- Never aggregate VND and PHP into one total. In a global view, show each market side by side in local
  currency; USD may only be a clearly labeled approximate display reference, never payout currency.
- Tax demo: VN 10%, PH 8%. Always show Gross, Tax and Net as separate values.

FILE STRUCTURE
Create these Figma pages:
1. “00 Foundations” for variables, styles, components and state matrices.
2. “01 Desktop — 1440” for exactly 12 logical product frames arranged in three horizontal swimlanes:
   Onboarding S01–S03, Creator lifecycle S04–S08, and Staff control S09–S12.
3. “02 Mobile — 390” for the same 12 responsive variants in the same swimlane order. Use names
   “Sxx/Desktop” and “Sxx/Mobile”; 24 artboards still represent only 12 logical screens.
4. “03 Prototype & Notes” for flow arrows, overlays and implementation annotations.
Do not count dialogs, drawers, bottom sheets or state variants as additional numbered screens.

VISUAL DIRECTION
- Premium dark creator-economy operations product: confident, modern, data-rich and calm.
- Avoid a generic crypto dashboard, neon overload, excessive glassmorphism, giant marketing heroes,
  random gradients and decorative charts with no meaning.
- Dark mode is the rendered default. Also create variable modes that can support a future light theme.
- Source currently uses system-ui. In Figma use SF Pro Display/Text when available; otherwise use a
  clearly documented system-ui equivalent. Use tabular numerals for money, counts and deadlines.
- Use crisp 20 px outline SVG icons, never emoji and never hand-drawn icon primitives.

SEMANTIC TOKENS
Create Figma variables instead of hardcoded one-off values:
- Background / canvas: #070A12
- Surface / default: #0F172A
- Surface / elevated: #131E34
- Surface / interactive: #18243D
- Border / subtle: #22304A
- Text / primary: #F8FAFC
- Text / secondary: #94A3B8
- Brand / primary: #5B7CFF
- Brand / cyan accent: #22D3EE
- Success: #22C55E
- Warning: #F59E0B
- Danger: #F43F5E
- Info: #38BDF8
Verify WCAG AA contrast and adjust token values if needed.
- 8-point spacing system: 4, 8, 12, 16, 24, 32, 40, 48, 64.
- Radius: 8 for controls, 12 for cards, 16 for large panels, 999 for chips.
- Subtle elevation only: one low shadow and one modal shadow.

TYPOGRAPHY
- Display 32/40 semibold; H1 28/36 semibold; H2 22/30 semibold; H3 18/26 semibold.
- Body 14/22 regular; Body strong 14/22 semibold; Caption 12/18; Label 13/18 medium.
- Money display 28/34 semibold with tabular numerals. Dense table amount 14/20 medium, right aligned.
- Vietnamese copy is the default. Prepare for English text expansion of at least 30% without clipping.
  Filipino uses English fallback in Phase 1.

LAYOUT AND RESPONSIVE RULES
- Desktop 1440: max content width 1280; 12-column grid; 24 px gutters; staff/creator sidebar 240 px.
- Tablet 1024: 8-column grid; sidebar collapses to a 72 px navigation rail; content stacks logically.
- Mobile 390 and validation at 375: 4-column grid; 16 px margins; no global horizontal scrolling.
- Creator mobile uses a five-item bottom navigation: Home, Discover, My Campaigns, Earnings, Wallet.
- Staff mobile uses a top app bar and navigation drawer; staff data tables become prioritized stacked
  cards. A controlled horizontal scroll is allowed only for finance comparison data that cannot be
  meaningfully stacked.
- KPI layout: 4 columns desktop → 2 tablet → 1 or 2 mobile depending on label length.
- Desktop dialog becomes a full-screen mobile sheet. Desktop detail drawer becomes a full-screen
  mobile detail view. Filters become a bottom sheet on mobile.
- Keep the primary operational CTA sticky on mobile for Join, Submit, Approve, Lock Batch and Payout.
- Minimum touch target 44×44 px. Add visible keyboard focus, hover, pressed, loading and disabled states.

APP SHELLS
Create reusable shells, not duplicated frames:
1. Creator Shell: left sidebar on desktop, header with breadcrumb/page title, global search where useful,
   country profile switcher, VI/EN selector, Local/USD-reference toggle, notification icon and avatar.
   Mobile uses the five-item bottom navigation.
2. Local Staff Shell: sidebar + fixed country badge + role badge. Local country is informative, not a
   cross-country switch. Header contains search, help, audit-safe user menu and density control.
3. Global Admin Shell: sidebar + true VN/PH/All Markets filter + admin identity and audit access.
4. Auth Shell: centered login card with a restrained product illustration; no authenticated navigation.

REUSABLE COMPONENTS
Build each repeated element once as a component set, then use instances:
- AppShell, SidebarNavItem, BottomNavItem, PageHeader, Breadcrumb, UserMenu.
- CountryProfileSwitcher, LanguageSelector, CurrencyDisplayToggle.
- Button with primary/secondary/ghost/danger; sizes and all interaction states.
- Input, Select, Search, Textarea, OTP, Upload/Dropzone, Checkbox, Radio, Toggle.
- Tabs, SegmentedControl, FilterChip, Pagination, Stepper.
- KPI card, Campaign card, Money summary, Balance card, Deadline card.
- StatusChip with icon + text; never communicate status using color alone.
- Progress bar/ring, Slots meter, Simple stacked distribution bar, Skeleton.
- Responsive DataTable, Mobile DataCard, ListRow, ReviewItem, Timeline, AuditEventRow.
- EmptyState, ErrorState, PermissionState, Conflict409 banner, Toast, InlineAlert.
- Modal, Drawer, BottomSheet, StickyActionBar, Confirmation pattern.
Use Auto Layout throughout, bind colors/spacing/radii to variables, and apply shared text/effect styles.

STATUS LANGUAGE
- KYC: Draft, Submitted, Resubmitted, Approved, Needs changes/Rejected.
- Participation: Joined, Content submitted, Approved, Rejected, Waitlisted, Expired, Left.
- Earning: Pending, Available, Paid, Reversed.
- Payout: Processing, Paid, Failed — balance released, Unknown — funds held.
- Reconciliation: Open, Locked.
Every status uses icon + label + accessible semantic color.

REALITY GUARDRAILS
- Do not show the prototype’s blue “Màn này trả lời…” explainer or developer StateBar inside product
  frames. Put product rationale and state notes outside the frame as Figma annotations.
- Country Config save, bulk review, reconciliation export, campaign update/pause and admin MFA need
  backend work. They may be designed, but mark them in handoff annotations as “Requires API”.
- Apply-to-campaign approval, platform fee and prepaid escrow are future concepts. Do not present them
  as live Phase-1 functionality; only show behind a clearly labeled Beta/feature-flag annotation.
- Mask PII: “079•••••••234”, “1900•••4455”. Never put realistic full ID or bank numbers in mock data.
- Use pagination or virtualized-list patterns; never render the hundreds of repeated test rows visible in
  the current MVP screenshots.
- Do not invent analytics. Every KPI/chart must have an external annotation with its source field or
  derived formula. If a field is absent, render “—”, an empty state, or “Planned / not connected”; never
  fabricate a plausible number, percentage, trend arrow or comparison.
- Production frames must not expose raw enum/debug text, “prototype” labels, or one-click demo-role
  login shortcuts. Friendly localized labels belong in the UI; technical names belong in annotations.

Create the foundation page, tokens, styles, component inventory and the three reusable app shells now.
Return a concise component inventory and verify that every created container uses Auto Layout.
```

---

## Prompt 01 — S01 Sign in & Secure Access

```text
Apply the existing Affiliate GLOBAL foundations and components. Create S01 “Sign in & Secure Access”
for Desktop 1440 and Mobile 390. Reuse Auth Shell and do not create new unlinked styles.

GOAL
Let creators enter in one clear action while also supporting a staff-access variant. Make the mock/demo
environment transparent without making the UI feel unfinished.

DESKTOP ANATOMY
- Two-column auth layout, approximately 55/45. Left side: restrained abstract illustration showing the
  flow “Create content → Approved → Earn → Withdraw”, plus small VN and PH market markers. Do not use a
  giant marketing hero or stock-office photography.
- Right side: 440–480 px login card with logo, heading “Kiếm thu nhập từ nội dung của bạn”, supporting
  copy, two full-width SSO buttons “Tiếp tục với Google” and “Tiếp tục với TikTok”. Use real SVG provider
  marks or clean neutral icon placeholders.
- Add a quiet “Môi trường demo” badge and one-line disclosure that Phase-1 SSO is mocked. Keep the
  disclosure secondary, not a warning banner.
- Divider and text button “Đăng nhập dành cho nhân viên”. This opens a staff-access variant inside the
  same component set; do not make another numbered screen.
- Footer links: Terms, Privacy, Help; language selector VI/EN. Do not show a country switcher before the
  user has selected a country profile.

STAFF VARIANT
- Work email/SSO action, role-safe copy and an MFA six-digit OTP step variant. Annotate MFA as
  “Requires API” in the Notes page because current runtime does not enforce staff MFA.
- Do not place “Login as Ops/Finance/Admin demo” shortcuts in the production frame.

COMPONENT STATES
- Default, button loading, SSO provider unavailable, invalid/expired session, signed-in confirmation.
- Error must be inline with a retry action; do not rely on red color only.
- Prototype: creator success → S02; staff success routes to the appropriate S09–S12 role dashboard.

MOBILE
- Single-column card, illustration reduced to a small header motif, full-width buttons, 16 px margins,
  44 px minimum controls. Do not let provider labels wrap.
```

## Prompt 02 — S02 Creator Home & Country Onboarding Dashboard

```text
Apply the existing Affiliate GLOBAL design system. Create S02 “Creator Home & Country Onboarding” for
Desktop 1440 and Mobile 390 using Creator Shell. This is the primary creator dashboard and must feel
immediately useful, not like a settings page.

RETURNING-CREATOR DEFAULT STATE
- Page header: “Chào buổi sáng, Minh Anh”, current country profile “Việt Nam · VND”, VI/EN and Local/USD
  controls in the global header.
- Top KPI row using real Phase-1 concepts only:
  1. KYC status: Approved / Needs action.
  2. Campaigns needing action.
  3. Pending earnings.
  4. Withdrawable balance.
  Do not add percentage deltas or fake historical trends.
- A prominent “Việc cần làm tiếp theo” panel sorted by urgency: nearest 48h/24h deadline, rejected
  content to fix, waitlist promotion, or KYC action. One dominant CTA.
- “Chiến dịch đang tham gia” compact cards with state, reward snapshot, countdown and action.
- “Đề xuất cho bạn” three campaign cards from the current country, using abstract brand-gradient covers
  generated from brand initials/platform icons so the design does not depend on a missing image API.
- Small earnings distribution component showing Pending versus Available. Use a labeled stacked bar,
  not an invented time-series chart.

FIRST-TIME / ADD-COUNTRY VARIANT
- Keep it as a variant of S02, not a thirteenth screen.
- Two country profile cards: Việt Nam (vi-VN, VND) and Philippines (en-PH, PHP). Each clearly says
  “Tạo hồ sơ”, “Đang dùng”, or “Chuyển sang”. Explain that KYC, bank, tax and earnings stay separate.
- After profile creation, the primary CTA is “Hoàn tất KYC” → S03. Users may still browse campaigns.

EMPTY/ERROR STATES
- New user, no active campaigns, no recommended campaigns, API unavailable, expired session.
- Cross-country access errors must never expose another country’s data.

MOBILE
- Use the Creator bottom navigation with Home active. KPI cards use two columns only when labels remain
  readable; otherwise one column. “Next action” appears first, then active campaigns, then recommended.
- Country switching opens a full-width bottom sheet with explicit separation warning.
```

## Prompt 03 — S03 Country Profile & KYC

```text
Create S03 “Country Profile & KYC” for Desktop 1440 and Mobile 390. Reuse Creator Shell, form
components, stepper, StatusChip and StickyActionBar.

GOAL
Make country-specific verification understandable and repairable. A creator should instantly know what
is approved, what is under review and exactly what must be corrected. Explain that KYC approval is
required to Join, not to browse campaigns.

DESKTOP LAYOUT
- Header with current country profile, overall KYC state, completion count and a compact 4-step progress
  indicator. Do not expose unmasked PII.
- 8/4 column layout. Main column contains four checklist sections:
  1. Họ và tên.
  2. CCCD/ID and document upload placeholder marked as demo/mock integration.
  3. Tài khoản ngân hàng.
  4. Mã số thuế / agreement acknowledgement.
- Right rail contains “Tại sao cần KYC?”, country-specific tax summary, review SLA, security note and a
  single CTA to continue browsing while waiting.

FIELD-LEVEL BEHAVIOR
- Accepted: green check + “Đã duyệt”, masked value, locked control and lock icon.
- Needs changes: danger icon + exact Ops reason directly below the affected field; only this field is
  editable and included in resubmit.
- Submitted/Resubmitted: read-only with review timeline and no duplicate submit action.
- Draft: clear required/optional labels, validation and a single submit action.
- Approved overall state: success panel and CTA “Khám phá campaign” → S04.
- Loading, upload error, 409 stale decision and API unavailable variants.

PRIVACY AND ACCESSIBILITY
- Example values only: “079•••••••234”, “1900•••4455”.
- Pair status color with icons and text; preserve keyboard order; explain why a field is locked.

MOBILE
- Convert four sections to an accordion/checklist with progress fixed under the header. Use a sticky
  bottom “Gửi hồ sơ” or “Gửi lại 1 mục” CTA. Rejection reasons must remain visible without opening a
  tooltip.
```

## Prompt 04 — S04 Campaign Discovery

```text
Create S04 “Campaign Discovery” for Desktop 1440 and Mobile 390 using Creator Shell. The screen should
feel editorial and opportunity-led while remaining data-accurate.

DESKTOP ANATOMY
- Page header “Khám phá campaign”, search input and optional compact summary of the current market.
- Filter bar: Platform, Availability, Reward range, Campaign status; Sort by Recommended, Highest reward,
  Ending soon. Use reusable filter chips. Keep country filtering in the global profile switcher, not as a
  query that can leak cross-country data.
- 3-column campaign grid with pagination or “Load more”; never show an unbounded repeated list.
- Campaign card component:
  - Abstract gradient cover with brand initials and platform icon; no dependency on a backend image URL.
  - Campaign title, brand, platform and optional end date.
  - Reward as the strongest number: “500.000 ₫ / nội dung được duyệt”.
  - Slots meter “37/50 còn lại”; status Open, Full, Paused or Ended.
  - Clear “Xem chi tiết” CTA; entire card has a keyboard-accessible hit target.
- Use one featured card only if it is supported by the same data; do not invent a paid-featured model.

STATES
- Loading skeleton matching final cards; no results after filters; no campaigns in current market; API
  error with retry; signed-out state; paused/full/ended states.
- A full campaign may still lead to S05 so the user can join a waitlist.

MOBILE
- One-column card list; search at top; filter/sort opens a bottom sheet; active filters appear as
  horizontally scrollable chips with visible count and “Xóa lọc”. Bottom navigation has Discover active.
- Campaign card keeps reward, slots and status above the fold with at least a 44 px CTA.
```

## Prompt 05 — S05 Campaign Detail & Join / Waitlist

```text
Create S05 “Campaign Detail & Join” for Desktop 1440 and Mobile 390. Reuse Creator Shell, CampaignCard,
MoneyDisplay, SlotsMeter, StatusChip, Modal/Sheet and StickyActionBar.

DESKTOP LAYOUT
- Breadcrumb back to Discovery, campaign title and a branded abstract cover.
- Main content 8 columns; sticky action rail 4 columns.
- Main sections: overview, content brief, required platform, required hashtag, deliverable checklist,
  submission timeline, review/payment explanation and creator-safe terms.
- Explain reward plainly: trigger “Content được duyệt”, pricing “Cố định”, value “500.000 ₫”, and hard
  cap implied by available slots. Do not expose technical enum strings as the primary UI copy.
- Sticky join rail: reward, slots remaining, campaign end date, creator KYC eligibility, first-submit SLA
  48h and one dominant CTA.

JOIN STATES AS VARIANTS
- Eligible/Open: “Tham gia campaign”.
- KYC required: CTA opens a guard modal explaining why KYC is required and linking to S03; browsing and
  back navigation remain available.
- Joined: success state, snapshot reward, submit deadline, “Nộp nội dung” → S06 and secondary “Rời suất”.
- Full: “Vào danh sách chờ”; after joining, show FCFS position and explain that waitlist does not reserve
  a paid slot until promoted.
- Waitlisted: position, joined-at time, leave-waitlist action and similar-campaign recommendations.
- Paused/Ended: disabled CTA with clear explanation.
- Strike blocked: explain the two reclaimed-slot limit without shaming language; show similar campaigns.
- API 409/slot race: friendly state that either confirms waitlist placement or asks the user to refresh.

RECOMMENDATIONS
- Show up to three same-country similar campaigns, prioritizing the same platform or nearby reward.

MOBILE
- Collapse content into scannable sections; sticky bottom CTA always displays reward + Join/Waitlist.
- Join confirmation and KYC guard become bottom sheets. Keep deadline and required hashtag easy to copy.
```

## Prompt 06 — S06 My Campaigns & Content Submission

```text
Create S06 “My Campaigns & Content Submission” for Desktop 1440 and Mobile 390. This screen deliberately
combines the existing My Campaigns and Submit routes so the product stays at exactly 12 screens.

INFORMATION ARCHITECTURE
- Page-level tabs or segmented filter: Cần làm, Đang duyệt, Hoàn thành, Danh sách chờ, Tất cả.
- Top summary: count needing action, nearest deadline and currently held slots. Do not show fake trend
  percentages.
- Desktop master-detail layout: 5-column campaign participation list + 7-column selected detail panel.
- Each participation row shows campaign, state, reward snapshot, deadline/waitlist position and one next
  action. Sort “needs action” by nearest deadline.

SELECTED DETAIL PANEL
- Campaign summary and exact state timeline: Joined → Submitted → Approved, or Rejected → Resubmitted.
- Submission form with Post URL and Caption/hashtag field.
- Platform URL is a hard validation: wrong domain blocks submission.
- Missing hashtag is an advisory warning because it may appear inside the video; do not make it a false
  hard failure.
- Show required platform and hashtag next to the form; include copy actions.
- First submission deadline is 48h from Join. Rejected content shows the Ops reason and a 24h fix
  countdown. The clock is visibly paused while waiting for Ops.
- Attempt history is append-only: attempt number, submitted time, URL, automatic checks, review state and
  rejection reason. Do not overwrite old attempts.
- Primary CTA changes among Submit, Resubmit, View review, or no action. “Rời suất” is destructive and
  requires confirmation.

STATES
- Joined, Content submitted, Approved, Rejected, Waitlisted, Expired, Left; loading/empty/API error;
  invalid platform URL; hashtag warning; duplicate pending submission; conflict 409.

MOBILE
- Show campaign list as action cards. Selecting one opens a full-screen detail view within the same S06
  product screen. Use a sticky Submit/Resubmit action bar. Bottom navigation has My Campaigns active.
```

## Prompt 07 — S07 Earnings Dashboard

```text
Create S07 “Earnings Dashboard” for Desktop 1440 and Mobile 390 using Creator Shell, KPI cards,
MoneyDisplay, StatusChip, responsive tables/cards and ledger timeline.

DATA HIERARCHY
- Page title and current country/currency context.
- KPI row:
  1. Total Gross.
  2. Total Tax.
  3. Total Net.
  4. Available to withdraw.
- Secondary labeled distribution for Pending, Available and Paid. Use a stacked bar or segmented money
  summary; do not invent a monthly trend if the API does not supply time-series aggregation.
- Local amount is primary. Approximate USD appears only when the user enables the global toggle and must
  include “≈” and “tham chiếu”.

CONTENT
- Filters: period, status and campaign. Search by campaign/content.
- Desktop earnings table: date, campaign/content, Gross, Tax, Net, status. Align money right and use
  tabular numerals.
- Expandable row or side detail shows source submission, reward snapshot and ledger references.
- Separate “Sổ cái” tab/timeline showing append-only credits, reserves, paid/release or reversal entries.
- Add a calm explanation: Pending waits for reconciliation; Available can be withdrawn; payment outcome
  is authoritative in Wallet/Payout history.
- CTA “Rút tiền khả dụng” → S08, disabled with explanation when Available is below minimum.

STATES
- No earnings, only Pending, Available, Paid/Reversed, loading, API error and signed-out.
- Avoid implying that every earning is marked Paid by the current payout runtime; Wallet history remains
  the source of truth for payout status.

MOBILE
- KPI cards stack; earnings table becomes cards showing Net and status first, with Gross/Tax in expanded
  details. Keep filters in a bottom sheet. Bottom navigation has Earnings active.
```

## Prompt 08 — S08 Wallet & Payout

```text
Create S08 “Wallet & Payout” for Desktop 1440 and Mobile 390 using Creator Shell. Design for trust: the
creator must understand where the money is and why a failed/unknown payout does not disappear.

DESKTOP ANATOMY
- Balance hierarchy: Available to withdraw as the hero amount; Reserved/held amount; minimum withdrawal;
  masked destination bank account. Local currency is primary, optional USD reference secondary.
- Primary “Yêu cầu rút tiền” action. Disable with a precise reason when below minimum, KYC/bank is missing,
  or payout feature is unavailable.
- Two-step payout overlay within the same screen:
  1. Amount and destination confirmation.
  2. Six-digit OTP with expiry, resend and error states.
- Confirmation summary must show amount, destination, reserve behavior and no hidden platform deduction.

PAYOUT HISTORY
- Responsive list/table: request date, amount, destination, state and reference.
- States with icon + text + explanation:
  - PROCESSING: funds are reserved.
  - PAID: completed.
  - FAILED_RELEASED: balance was returned exactly once, with reason.
  - UNKNOWN_HOLD: funds stay safely held while Finance verifies; never claim they were refunded.
- Expandable timeline for attempts and manual resolution. Include support reference/correlation ID without
  exposing internal secrets.

ERROR AND TRUST STATES
- Invalid/expired OTP, insufficient available balance, duplicate request, provider unavailable, failed
  payout released, unknown hold and empty history.

MOBILE
- Balance card first, sticky withdrawal CTA, OTP as a full-screen sheet and history as stacked cards.
  Bottom navigation has Wallet active. Keep security/hold explanations readable without tooltips.
```

## Prompt 09 — S09 Ops Dashboard & Review Center

```text
Create S09 “Ops Dashboard & Review Center” for Desktop 1440 and Mobile 390 using Local Staff Shell.
The local country badge is fixed by role; do not give Local Ops a VN/PH cross-country switch.

DASHBOARD HEADER
- KPI cards computed from queue data only: KYC backlog, Content backlog, Oldest waiting item and Flagged
  content. Do not invent throughput/rejection-rate trends unless an aggregation API is added.
- Tabs: KYC Review and Content Review, each with count. Filters by state/age/risk plus search by creator.
- Add pagination/virtualized-list pattern; never show hundreds of repeated rows on one page.

DESKTOP WORKSPACE
- Split view: 4-column queue list and 8-column review detail. Selected item remains visible.
- Queue items show creator, submitted/resubmitted time, age/SLA, risk flags and status.

KYC DETAIL
- Masked creator identity, four fields and submitted values.
- Per-field Approve / Needs changes decision. Accepted fields are locked. Needs changes requires a reason.
- A review summary at the bottom lists all decisions before “Gửi quyết định”.

CONTENT DETAIL
- Creator, campaign, attempt number, submitted URL, open-in-new-tab preview, required platform/hashtag.
- Automatic checks show Platform Pass/Fail and Hashtag Present/Warning.
- Approve or Reject. Reject requires a reason. Explain that Approve creates one Pending earning.
- Conflict 409 variant: “Mục này vừa được người khác xử lý”, refresh queue and preserve unsent notes where
  safe.

BULK MODE
- Design a selectable bulk-review mode with a clear review summary and confirmation, but add an external
  Figma annotation “Requires API” because current runtime reviews individual items.

MOBILE
- Queue becomes cards. Opening an item uses a full-screen review view; sticky Approve/Reject actions.
  Navigation is a staff drawer. Long PII and URLs wrap safely; no horizontal page scroll.
```

## Prompt 10 — S10 Local Admin Campaign Dashboard & Builder

```text
Create S10 “Campaign Dashboard & Builder” for Desktop 1440 and Mobile 390 using Local Staff Shell.
Country is fixed to the Local Admin assignment.

DASHBOARD DEFAULT
- KPI cards derived from campaign data: Active campaigns, Paused/Ended count, total slots used/available,
  and committed budget cap. No CTR/ROAS/order metrics.
- Search/filter by status, platform and end date. Campaign table/cards show status, reward, slots meter,
  utilization and budget cap = slots × flat reward.
- Primary action “Tạo campaign”. Secondary Edit/Pause/Export actions may be designed but must carry an
  external “Requires API” handoff annotation because current runtime mainly supports create.

BUILDER WITHIN THE SAME PRODUCT SCREEN
- Open a right-side builder panel or full workspace state, not a new numbered screen.
- Five-step wizard: Basic information → Content brief → Reward rule → Slots & Budget → Review.
- Basic information: campaign name, brand, platform, required hashtag, start/end dates and country.
- Content brief: deliverable, acceptance checklist and localized copy structure.
- Reward rule visually teaches the three independent axes:
  1. Trigger: Content approved is active; View threshold and Paid order are locked/future.
  2. Pricing: Flat per content is active; Tiered and Percent are locked/future.
  3. Cap: Slots × Price is active and derived.
- Budget panel recalculates live: e.g. 30 slots × 500.000 ₫ = 15.000.000 ₫. Never let users manually
  type a contradictory total.
- Sticky preview shows how the creator-facing Campaign Card and S05 join panel will look.
- Review step lists all terms, budget and country context; success variant links back to the dashboard.

FUTURE CONCEPTS
- Apply approval, platform fee and prepaid escrow may appear only in a clearly marked Beta/feature-flag
  annotation, not as working Phase-1 controls.

MOBILE
- Dashboard uses campaign cards. Builder becomes a full-screen stepper with sticky Back/Continue and a
  separate preview sheet. Preserve entered data when moving between steps.
```

## Prompt 11 — S11 Finance Dashboard & Workbench

```text
Create S11 “Finance Dashboard & Workbench” for Desktop 1440 and Mobile 390 using Local Staff Shell.
Country and local currency are fixed by the Finance role.

DASHBOARD HEADER
- KPI cards grounded in current data: Pending reconciliation Net, Open batches, Processing payouts and
  Unknown holds. Show amounts and counts, not invented trend percentages.
- Tabs: Reconciliation, Payout Queue, Unknown Holds, History.
- Optional USD reference card must be labeled demo/reference and never used as a payment amount.

RECONCILIATION
- Batch list: period, line count, valid Net, status Open/Locked, created/locked time.
- Batch detail uses a responsive table with creator, campaign, Gross/Tax/Net or Net, anomaly and status.
- Anomaly rows are visually distinct and excluded from the valid total with an explicit explanation.
- “Lock batch” is irreversible. Use a confirmation dialog summarizing line count, valid total, excluded
  anomalies and the consequence: valid earnings move from Pending to Available.
- Locked state is read-only with lock actor/time and an append-only audit link.
- Design “Export reconciliation” but annotate “Requires API” outside the product frame.

PAYOUT QUEUE
- Creator, masked destination, amount, reserved time and provider state.
- Provider mock result actions: Success, Fail, Unknown. Require a confirmation that explains each money
  outcome before execution.
- Fail releases the balance exactly once. Unknown moves to a separate hold queue and never auto-refunds.
- Unknown Holds tab supports manual Resolve as Paid or Resolve as Failed/Release, with notes and audit.

CONFLICT/ERROR STATES
- Nothing to reconcile, already locked 409, already settled, provider unavailable, unresolved hold,
  permission denied and loading.

MOBILE
- KPI cards stack; batch/payout rows become cards with the amount and state first. Batch detail is a
  full-screen view. Sticky Lock/Resolve actions. Allow controlled horizontal scrolling only for the
  detailed financial comparison table when a stacked representation would hide essential reconciliation.
```

## Prompt 12 — S12 Global Admin Control Center: Config + Audit

```text
Create S12 “Global Admin Control Center” for Desktop 1440 and Mobile 390 using Global Admin Shell.
This screen combines the existing Country Config and Audit routes so the system remains exactly 12
product screens.

OVERVIEW DASHBOARD
- True All Markets / Vietnam / Philippines scope control.
- KPI cards based only on available concepts: Markets configured, active feature flags, latest config
  versions and recent audit-event count. Do not invent global revenue, creator growth or campaign ROI
  without an aggregate endpoint.
- Two country comparison cards/table with locale, currency, tax rate, minimum payout, KYC/Payout/CPS
  flags and config version.
- Small “Recent critical actions” audit preview with actor, action, country and time.

TABS
1. Overview.
2. Country Configuration.
3. Audit Trail.
4. Roles & Access overview — mark as Requires API if it shows more than current role context.

COUNTRY CONFIGURATION
- Select VN or PH; edit locale/currency display metadata, tax percent, minimum payout and feature flags.
- Use a side-by-side Current vs Proposed diff and a high-friction confirmation for sensitive changes.
- Show config version and expected audit record.
- Add an external Figma handoff annotation “Save requires API; current runtime is read-only/mock”. Do not
  misrepresent save as already integrated.

AUDIT TRAIL
- Filter by country, action, actor, target type and date. Search target/correlation reference.
- Responsive audit table: timestamp, actor, action, country, target and metadata summary. Detail drawer
  shows a readable JSON/key-value diff without exposing secrets.
- Audit is append-only. No edit/delete actions. Use pagination/virtualization; current list is capped, so
  annotate pagination as an implementation need.
- Actions may include KYC reviewed, content approved/rejected, campaign created, reconciliation batch
  locked, payout settled/resolved and country-config change when implemented.

SECURITY
- Global Admin is the only role allowed to see All Markets. Make this scope visually obvious.
- Sensitive changes and role access require confirmation; include actor identity in the confirmation.

MOBILE
- Country comparison becomes stacked cards; config editor becomes a full-screen sheet; audit table
  becomes event cards with a detail view. Use staff navigation drawer and 44 px controls.
```

---

## Prompt 13 — Responsive, content, accessibility và handoff QA

```text
Audit and repair the complete Affiliate GLOBAL Figma file. Do not create additional numbered screens.

STRUCTURE
- Confirm exactly 12 Desktop product frames and the same 12 Mobile variants, named S01–S12.
- Confirm the canvas uses three readable swimlanes: Onboarding S01–S03, Creator lifecycle S04–S08,
  Staff control S09–S12; staff screens are role workspaces, not one sequential staff journey.
- Confirm dialogs, drawers, sheets and alternate states are component variants/overlays, not extra screens.
- Confirm repeated elements are component instances; no duplicated near-identical cards, rows or buttons.
- Confirm every major frame and reusable component uses Auto Layout and Figma variables/styles.

RESPONSIVE
- Validate at 1440, 1024, 390 and 375 px.
- Fix all clipping, overlap, accidental fixed widths and global horizontal scrolling.
- Desktop sidebar → tablet rail → creator mobile bottom nav or staff mobile drawer.
- Tables become readable mobile cards; only essential finance comparison may use controlled horizontal
  scrolling inside its panel.
- Desktop modal/drawer → mobile full-screen sheet/detail. Primary operational CTA stays sticky on mobile.

LOCALIZATION AND MONEY
- Test default Vietnamese and English with at least 30% text expansion. No truncated buttons or tabs.
- Filipino uses an English fallback note where translation is unavailable.
- Verify “500.000 ₫”, “₱1,200.00” and optional “≈ $19.65 tham chiếu”. Local currency remains primary.
- Verify no dashboard sums VND and PHP. Global comparison keeps each country in its local currency.
- Verify Gross − Tax = Net is visually and numerically consistent in every sample.
- Ensure VN/PH profile switching never visually merges country-specific KYC, bank, earnings or payout data.

BUSINESS ACCURACY
- No CPC, CTR, ROAS, orders, sales conversion or pay-per-view multiplier.
- Reward is always Content approved + Flat + Slots × Price.
- KYC gates Join, not Discovery.
- Show 48h submit deadline, 24h fix deadline, waitlist position and paused clock while Ops reviews.
- Payout Fail releases balance once; Unknown holds funds; never describe Unknown as refunded.
- Locked reconciliation is read-only and audit-linked.

ACCESSIBILITY
- WCAG AA contrast; 44×44 minimum touch targets; visible keyboard focus; logical tab order.
- Status always uses icon + text + color. Do not rely on color, hover or tooltip alone.
- Form fields have persistent labels, helper/error text and clear disabled/locked reasons.
- PII remains masked; no realistic full ID/bank data.

VISUAL QUALITY
- Remove any developer StateBar and blue “Màn này trả lời…” note from product frames.
- Remove decorative charts with no data source, excessive gradients/glass and unbounded repeated test rows.
- Keep hierarchy crisp: one primary action per panel, money aligned, deadlines scannable, dangerous actions
  separated from primary actions.
- Verify the actual rendered font matches the documented system-ui family and uses tabular numerals.

HANDOFF
- Add a compact implementation annotation outside each frame listing route/data needs and states.
- Add a source annotation to every KPI, percentage and chart. Delete any metric that cannot be traced to
  an API field or an explicitly documented derived formula.
- Mark Country Config save, staff MFA, bulk review, reconciliation export and campaign update/pause as
  “Requires API”. Mark Apply, platform fee and escrow as future/Beta only.
- Create prototype links for the main creator money flow and reject/resubmit loop.
- Produce a final audit matrix: Screen ID | Persona | Required data fields | Happy path | Edge states |
  Country/RBAC | Desktop | Mobile | Pass/Fail | Fix made.
- Produce a final checklist of corrected issues and any remaining implementation dependencies.
```

## 3. Dữ liệu mẫu an toàn để Figma dùng

- Creator: `Nguyễn Minh Anh`; ID `079•••••••234`; bank `1900•••4455`.
- VN campaign: `Review son mùa hè` · `GlowUp Cosmetics` · TikTok · `500.000 ₫` · 37/50 slots ·
  `#GlowUpHe2026`.
- VN campaign: `Giới thiệu app học tiếng Anh` · `EngGo` · YouTube · `800.000 ₫`.
- PH campaign: `Snack taste test` · `CrunchCo` · TikTok · `₱1,200.00`.
- Earnings example: Gross `500.000 ₫` − Tax `50.000 ₫` = Net `450.000 ₫`.
- Minimum payout: VN `200.000 ₫`; PH `₱500.00`.

## 4. Những thứ không được bê nguyên từ prototype hiện tại

- Banner giải thích cho hội đồng thẩm định và thanh đổi trạng thái dev.
- Page max-width 880 px cho mọi loại màn; staff workbench cần vùng dữ liệu rộng hơn.
- Danh sách campaign/Ops/Finance kéo dài vô hạn từ seed/test data.
- Bảng mobile chỉ co nhỏ hoặc bắt người dùng cuộn cả trang ngang.
- Emoji làm icon, font quá nhỏ 11–12 px cho nội dung chính, chip hit-area dưới 44 px.
- VN/PH switch cho Local Ops/Finance/Admin; local staff phải bị khóa đúng country.
- Metric không tồn tại như GMV, platform revenue, CTR, CPC, CVR, ROI, ROAS, click/order/sales,
  view/follower, growth %, approval-rate trend, average review SLA, payout success rate, forecast hoặc
  pay-per-view.
