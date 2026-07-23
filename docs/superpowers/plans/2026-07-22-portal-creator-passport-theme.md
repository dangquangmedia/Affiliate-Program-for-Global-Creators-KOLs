# Creator Dashboard — "Trạm điều hành biên giới" (Passport Theme) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin only the Creator dashboard (`/portal/creator`) with a distinctive "passport
checkpoint" visual identity (navy/brass palette, passport-bio header, stamp-style tab nav, icon
rail) while leaving all other 4 dashboards pixel-identical and all business logic untouched.

**Architecture:** Add an opt-in `variant="passport"` prop to the shared `Shell` component and an
opt-in `stamp` prop to the shared `Kpi` component (both default to current behavior when the prop
is omitted). Add a new CSS attribute-scoped block (`.app[data-shell-variant="passport"]`) that
overrides existing design-token CSS custom properties already consumed by every shared component
(`Kpi`, `Panel`, `Btn`, `MoneySpine`, `Chip`, `Modal`, sidebar/topbar) — so the new palette applies
automatically wherever the attribute is present, with zero changes to those component files'
logic. Only `apps/web/src/app/portal/creator/page.tsx` opts in.

**Tech Stack:** Next.js App Router (existing), CSS Modules (existing `portal.module.css`), React
(existing). No new dependencies.

## Global Constraints

- **Never rename, remove, or alter any `data-testid` value.** Full list currently in
  `apps/web/src/app/portal/creator/page.tsx` and `apps/web/src/app/portal/ui.tsx` (`Btn`
  `testId` prop) must remain byte-identical.
- **Never change business logic, fetch calls, or state** in `creator/page.tsx` — this plan only
  touches JSX structure passed to `<Shell>`/`<Kpi>` and CSS. Money calculations
  (`withdrawable`, `paidOut`, `money.*`) stay exactly as-is.
- **Other 4 dashboards (`ops`, `admin`, `finance`, `global`) must render pixel-identical to
  before this plan** — verified by their existing Playwright specs passing unmodified
  (`portal-ops.spec.ts`, `portal-admin.spec.ts`, `portal-finance.spec.ts`,
  `portal-global.spec.ts`, `portal-cross-link.spec.ts`, `portal-role-entry.spec.ts`).
- **Dark/light theme toggle must keep working** — every new color block below defines both a
  dark default and a `[data-theme="light"]` override, mirroring the existing pattern at
  `portal.module.css:10-84`.
- Design tokens, exact hex values, and rationale are locked in
  `docs/superpowers/specs/2026-07-22-portal-creator-passport-theme-design.md` — treat that file
  as the source of truth for anything not spelled out verbatim in a task below.
- No new npm/pnpm dependency. No new webfont — serif uses the system font-stack
  `Georgia, 'Times New Roman', serif`.

---

### Task 1: Passport theme CSS tokens (attribute-scoped, additive only)

**Files:**
- Modify: `apps/web/src/app/portal/portal.module.css` (append new block; do not touch existing
  `.app` / `.app[data-theme="light"]` blocks at lines 10-84)
- Test: `apps/web/e2e/portal-creator.spec.ts`, `apps/web/e2e/portal-ops.spec.ts`,
  `apps/web/e2e/portal-admin.spec.ts`, `apps/web/e2e/portal-finance.spec.ts`,
  `apps/web/e2e/portal-global.spec.ts` (regression — must stay green with zero source changes,
  since this task adds a CSS block gated by an attribute nothing sets yet)

**Interfaces:**
- Produces: CSS custom-property overrides scoped under
  `.app[data-shell-variant="passport"]` and `.app[data-shell-variant="passport"][data-theme="light"]`
  — consumed later by Task 2/3/4 via the `data-shell-variant` attribute on the Shell root `.app`
  div.

- [ ] **Step 1: Confirm current E2E baseline is green before any change**

Run:
```powershell
corepack pnpm exec playwright test portal-creator portal-ops portal-admin portal-finance portal-global --config apps/web/playwright.config.ts
```
Expected: all specs PASS (this is the pre-change baseline; Task 1 adds a CSS rule nothing
references yet, so this must still pass identically after Step 2).

- [ ] **Step 2: Append the passport token block to `portal.module.css`**

Add this immediately after the existing `.app[data-theme="light"] { ... }` block (after line 84,
before the `/* border-box toàn khu */` comment at line 86):

```css
/* ---- Trạm điều hành biên giới (Passport theme) — chỉ áp khi Shell nhận variant="passport",
   xem docs/superpowers/specs/2026-07-22-portal-creator-passport-theme-design.md ---- */
.app[data-shell-variant="passport"] {
  --ink: #121B3A;
  --surface: #0D142B;
  --surface-2: #16204A;
  --elevated: #1B2447;
  --line: #2A3B66;
  --line-soft: #1F2C4E;
  --text: #EDE6D3;
  --text-dim: #B7C2DE;
  --text-mute: #8FA0C9;
  --brand: #D9A441;
  --brand-2: #E6BD6B;
  --brand-soft: #D9A44126;
  --ok: #4ADE80;
  --ok-soft: #4ADE801f;
  --warn: #D9A441;
  --warn-soft: #D9A4411f;
  --surface-deep: #0A0F22;
  --topbar-bg: #0D142Bcc;
}
.app[data-shell-variant="passport"][data-theme="light"] {
  --ink: #EDE6D3;
  --surface: #FFFFFF;
  --surface-2: #F7F1E3;
  --elevated: #FFFFFF;
  --line: #DCCFA6;
  --line-soft: #E9E0C8;
  --text: #121B3A;
  --text-dim: #3D4A73;
  --text-mute: #6B7BA6;
  --brand-soft: #B8801f22;
  --ok-soft: #4ADE8024;
  --warn-soft: #B880151f;
  --warn: #8A5E10;
  --surface-deep: #F7F1E3;
  --topbar-bg: #FFFFFFcc;
}
```

- [ ] **Step 3: Re-run the same baseline suite to confirm no regression**

Run the identical command from Step 1. Expected: all specs still PASS — since no component
currently sets `data-shell-variant`, this new CSS block is inert (matches nothing), proving the
addition is safe before Task 2 wires it up.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/portal/portal.module.css
git commit -m "style(portal): add passport theme CSS tokens, gated by data-shell-variant"
```

---

### Task 2: `Shell` component — `variant="passport"` structural branch

**Files:**
- Modify: `apps/web/src/app/portal/ui.tsx:97-190` (the `Shell` function)
- Modify: `apps/web/src/app/portal/portal.module.css` (append new classes for the passport
  header/tab-nav/rail — see Step 2)
- Test: `apps/web/e2e/portal-ops.spec.ts`, `apps/web/e2e/portal-admin.spec.ts`,
  `apps/web/e2e/portal-finance.spec.ts`, `apps/web/e2e/portal-global.spec.ts`,
  `apps/web/e2e/portal-cross-link.spec.ts`, `apps/web/e2e/portal-role-entry.spec.ts`
  (regression — these 4 dashboards never pass `variant`, so they must exercise the exact same
  code path as before)

**Interfaces:**
- Consumes: existing `Shell` props (`role`, `market`, `setMarket`, `marketLocked`, `nav`,
  `active`, `setActive`, `title`, `subtitle`, `user`, `showUsd`, `setShowUsd`, `children`) —
  unchanged signatures, all still required exactly as today.
- Produces: new optional prop `variant?: "passport"` on `Shell`. When omitted (`undefined`),
  `Shell` renders byte-identical output to today. When `"passport"`, renders the passport header
  + stamp-tab nav + icon rail described below, and sets `data-shell-variant="passport"` on the
  root `.app` div (consumed by Task 1's CSS).
- Produces: `kycOk?: boolean` optional prop on `Shell` — only meaningful when
  `variant === "passport"`, drives the rotated status stamp in the passport header (per design
  spec §"Header trang bìa hộ chiếu"). Ignored otherwise.

- [ ] **Step 1: Capture current `git` HEAD as baseline reference**

```bash
git log -1 --format=%H
```
Note this hash — used to diff against after Step 2 if anything looks wrong.

- [ ] **Step 2: Add passport CSS classes to `portal.module.css`**

Append after the passport token block from Task 1:

```css
/* ---- Passport variant: structural classes (header/tab-nav/rail) ---- */
.passportRail {
  width: 52px;
  background: var(--surface-deep);
  border-right: 1px solid var(--line-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 18px;
  height: 100vh;
  position: sticky;
  top: 0;
}
.passportRailBtn {
  width: 32px; height: 32px; border-radius: var(--r-sm);
  display: grid; place-items: center;
  background: none; border: none; color: var(--text-mute); cursor: pointer;
}
.passportRailBtn:hover { color: var(--text); background: var(--surface-2); }
.passportRailFoot { margin-top: auto; }

.passportHeader {
  background: linear-gradient(135deg, var(--surface), var(--elevated));
  border-bottom: 2px solid var(--brand);
  padding: 18px 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.passportEyebrow { color: var(--text-mute); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; }
.passportName { color: var(--text); font-family: Georgia, "Times New Roman", serif; font-size: 20px; margin-top: 2px; }
.passportId { color: var(--text-mute); font-size: 11px; margin-top: 2px; font-family: ui-monospace, "Consolas", monospace; }
.passportStamp {
  width: 52px; height: 52px; border-radius: 50%;
  border: 2px solid var(--brand);
  display: flex; align-items: center; justify-content: center;
  color: var(--brand); font-size: 10.5px; font-weight: 700; text-align: center; line-height: 1.2;
  transform: rotate(-8deg);
  flex-shrink: 0;
}
.passportStampOk { border-color: var(--ok); color: var(--ok); }

.passportTabs {
  display: flex; gap: 0;
  padding: 0 26px;
  background: var(--surface);
  border-bottom: 1px solid var(--line-soft);
  overflow-x: auto;
}
.passportTab {
  color: var(--text-mute); font-size: 13px; font-weight: 600;
  padding: 12px 16px; border: none; background: none; cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  display: flex; align-items: center; gap: 6px;
}
.passportTab:hover { color: var(--text); }
.passportTabActive { color: var(--text); border-bottom-color: var(--brand); }
.passportTabBadge {
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: var(--r-pill);
  background: var(--surface-2); color: var(--text);
}
```

- [ ] **Step 3: Branch `Shell`'s render on `variant` in `ui.tsx`**

Replace the `Shell` function signature and body (`ui.tsx:97-190`) — add the two new optional
props and an early-branch render for `variant === "passport"`, keeping the existing return block
completely unchanged for the default path:

```tsx
export function Shell({
  role, market, setMarket, marketLocked, nav, active, setActive,
  title, subtitle, user, showUsd, setShowUsd, children, variant, kycOk,
}: {
  role: Role;
  market: Market;
  setMarket: (m: Market) => void;
  marketLocked?: boolean;
  nav: NavItem[];
  active: string;
  setActive: (k: string) => void;
  title: string;
  subtitle?: string;
  user: { name: string; sub: string };
  showUsd: boolean;
  setShowUsd: (v: boolean) => void;
  children: ReactNode;
  variant?: "passport";
  kycOk?: boolean;
}) {
  const initials = user.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
  const mobileNav = nav.slice(0, 5);

  if (variant === "passport") {
    return (
      <div className={s.app} data-market={market} data-portal-root data-shell-variant="passport">
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <aside className={s.passportRail}>
            <span className={s.logoMark} style={{ width: 28, height: 28 }}><Icon name="globe" size={16} /></span>
            <button className={s.passportRailBtn} aria-label="Đổi quốc gia" title="Đổi quốc gia">
              <Icon name="globe" size={17} />
            </button>
            <button className={s.passportRailBtn} aria-label="Thông báo" title="Thông báo">
              <Icon name="bell" size={17} />
            </button>
            <ThemeToggle />
            <div className={s.passportRailFoot}>
              <Link href="/portal" className={s.passportRailBtn} style={{ textDecoration: "none" }} aria-label="Đổi vai / Đăng xuất" title="Đổi vai / Đăng xuất">
                <Icon name="logout" size={17} />
              </Link>
            </div>
          </aside>

          <div className={s.main} style={{ flex: 1, minWidth: 0 }}>
            <header className={s.passportHeader}>
              <div>
                <div className={s.passportEyebrow}>{role.scope} · {MARKETS[market].name}</div>
                <div className={s.passportName}>{user.name}</div>
                <div className={s.passportId}>HỒ SƠ #{role.key.toUpperCase()}-{market}-{initials}</div>
              </div>
              <div className={`${s.passportStamp} ${kycOk ? s.passportStampOk : ""}`}>
                {kycOk ? "ĐÃ\nDUYỆT" : "CHỜ\nDUYỆT"}
              </div>
            </header>

            <nav className={s.passportTabs} aria-label="Điều hướng">
              {nav.map((n) => (
                <button key={n.key} onClick={() => setActive(n.key)}
                  className={`${s.passportTab} ${active === n.key ? s.passportTabActive : ""}`}>
                  {n.label}
                  {n.badge ? <span className={s.passportTabBadge}>{n.badge}</span> : null}
                </button>
              ))}
            </nav>

            <main className={s.content}>{children}</main>
          </div>
        </div>

        <nav className={s.mobileNav} aria-label="Điều hướng">
          {mobileNav.map((n) => (
            <button key={n.key} onClick={() => setActive(n.key)}
              className={`${s.mNavItem} ${active === n.key ? s.mNavActive : ""}`}>
              <Icon name={n.icon} size={21} />
              {n.label.split(" ")[0]}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className={s.app} data-market={market} data-portal-root>
      {/* ... existing default render, UNCHANGED, lines 119-189 of current file ... */}
    </div>
  );
}
```

**Important:** the `{/* ... existing default render, UNCHANGED ... */}` comment above is a
placeholder for *this task's instructions only* — when editing the real file, copy the actual
existing JSX from current `ui.tsx:119-189` verbatim into that branch. Do not literally write a
comment in the source; the default path's JSX must be byte-identical to what exists today so the
other 4 dashboards are provably unaffected.

Note: `passportTabBadge` reuses the existing `NavItem.badge` field already passed by
`creator/page.tsx`'s `navWithBadge` — no new data plumbing needed.

- [ ] **Step 4: Run the 6 regression specs (variant untouched by any of them)**

```powershell
corepack pnpm exec playwright test portal-ops portal-admin portal-finance portal-global portal-cross-link portal-role-entry --config apps/web/playwright.config.ts
```
Expected: all PASS, identical to Task 1 Step 1 baseline — proves the new `variant`/`kycOk` props
and the early-return branch do not alter behavior for callers that omit them.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/portal/ui.tsx apps/web/src/app/portal/portal.module.css
git commit -m "feat(portal): add opt-in passport Shell variant (header/tab-nav/rail)"
```

---

### Task 3: `Kpi` component — optional tilted status stamp

**Files:**
- Modify: `apps/web/src/app/portal/ui.tsx:225-236` (the `Kpi` function)
- Modify: `apps/web/src/app/portal/portal.module.css` (append `.kpiStamp` class)
- Test: `apps/web/e2e/portal-ops.spec.ts`, `apps/web/e2e/portal-admin.spec.ts`,
  `apps/web/e2e/portal-finance.spec.ts`, `apps/web/e2e/portal-global.spec.ts` (regression — none
  of these pass the new `stamp` prop, must stay green)

**Interfaces:**
- Consumes: existing `Kpi` props (`label`, `icon`, `value`, `cur`, `sub`, `usd`, `tone`) —
  unchanged.
- Produces: new optional prop `stamp?: { text: string; ok?: boolean }` on `Kpi`. When omitted,
  renders byte-identical to today. When provided, renders a small rotated badge in the card's
  top-right corner.

- [ ] **Step 1: Add the `stamp` prop and rendering to `Kpi` in `ui.tsx`**

```tsx
export function Kpi({ label, icon, value, cur, sub, usd, tone = "mkt", stamp }: {
  label: string; icon: IconName; value: string; cur?: string; sub?: ReactNode; usd?: string; tone?: Tone;
  stamp?: { text: string; ok?: boolean };
}) {
  return (
    <div className={s.kpi} style={{ ["--tone" as string]: toneVar[tone] }}>
      {stamp && (
        <span className={`${s.kpiStamp} ${stamp.ok ? s.kpiStampOk : ""}`}>{stamp.text}</span>
      )}
      <div className={s.kpiTop}><Icon name={icon} size={15} /> {label}</div>
      <div className={s.kpiVal}>{value}{cur && <span className={s.cur}>{cur}</span>}</div>
      {usd && <div className={s.kpiUsd}>{usd}</div>}
      {sub && <div className={s.kpiSub}>{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Add `.kpiStamp` CSS (requires `.kpi` to be `position: relative` — check first)**

Read `portal.module.css` around the existing `.kpi` class definition; if it does not already have
`position: relative`, add it (needed so the absolutely-positioned stamp anchors to the card, not
the page). Then append:

```css
.kpiStamp {
  position: absolute; top: 10px; right: 10px;
  border: 1px solid var(--warn); color: var(--warn);
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
  padding: 1px 6px; border-radius: 3px;
  transform: rotate(6deg);
}
.kpiStampOk { border-color: var(--ok); color: var(--ok); }
```

- [ ] **Step 3: Run the 4 regression specs**

```powershell
corepack pnpm exec playwright test portal-ops portal-admin portal-finance portal-global --config apps/web/playwright.config.ts
```
Expected: all PASS — none of these dashboards' `Kpi` call sites pass `stamp`, so nothing renders
differently for them.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/portal/ui.tsx apps/web/src/app/portal/portal.module.css
git commit -m "feat(portal): add optional tilted status stamp to Kpi"
```

---

### Task 4: Wire Creator dashboard to the passport variant

**Files:**
- Modify: `apps/web/src/app/portal/creator/page.tsx:184-202`
- Test: `apps/web/e2e/portal-creator.spec.ts`, `apps/web/e2e/creator-login.spec.ts`,
  `apps/web/e2e/portal-cross-link.spec.ts`, `apps/web/e2e/join-flow.spec.ts`,
  `apps/web/e2e/content-flow.spec.ts`, `apps/web/e2e/earnings-flow.spec.ts`,
  `apps/web/e2e/payout-flow.spec.ts`, `apps/web/e2e/payout-fail-flow.spec.ts`,
  `apps/web/e2e/kyc-flow.spec.ts` (every spec that drives the Creator dashboard — must all stay
  green since no `data-testid` or logic changed, only the visual shell)

**Interfaces:**
- Consumes: `Shell`'s new `variant`/`kycOk` props from Task 2, `Kpi`'s new `stamp` prop from
  Task 3.

- [ ] **Step 1: Pass `variant="passport"` and `kycOk` to `<Shell>`**

In `creator/page.tsx`, change the `<Shell ...>` opening tag (currently lines 184-187):

```tsx
<Shell role={ROLE} market={market} setMarket={setMarket} nav={navWithBadge} active={active} setActive={setActive}
  title={NAV.find((n) => n.key === active)?.label ?? "Trang chủ"}
  subtitle="Hồ sơ Creator — dữ liệu tách biệt theo từng nước"
  user={{ name: "Nguyễn Minh Anh", sub: `Creator · ${market}` }} showUsd={showUsd} setShowUsd={setShowUsd}
  variant="passport" kycOk={!!kyc && !kycPending}>
```

- [ ] **Step 2: Add `stamp` to the 2 KPI cards per the design spec's exact rule**

In the same file, the KPI grid (currently lines 196-201) — add `stamp` only to "Trạng thái KYC"
and "Thu nhập chờ đối soát", per spec §3 point 4 (the other two KPIs get no stamp):

```tsx
<Kpi label="Trạng thái KYC" icon="shield" tone={kycPending ? "warn" : "ok"}
  value={kycPending ? "Cần bổ sung" : kyc ? "Đã duyệt" : "Chưa nộp"}
  sub={kycPending ? <><Icon name="alert" size={13} /> có mục cần sửa</> : <><Icon name="check" size={13} /> Đủ điều kiện Join</>}
  stamp={kyc ? { text: kycPending ? "CHỜ" : "OK", ok: !kycPending } : undefined} />
<Kpi label="Chiến dịch cần làm" icon="layers" tone="brand" value={String(openTasks.length)} sub={<>đang chờ nộp / sửa nội dung</>} />
<Kpi label="Thu nhập chờ đối soát" icon="clock" tone="warn" value={fm(money.pending)} usd={usd(money.pending)}
  stamp={money.pending > 0 ? { text: "CHỜ" } : undefined} />
<Kpi label="Số dư ví (rút được)" icon="wallet" tone="ok" value={fm(withdrawable)} usd={usd(withdrawable)} />
```

- [ ] **Step 3: Run all 9 Creator-touching E2E specs**

```powershell
corepack pnpm exec playwright test portal-creator creator-login portal-cross-link join-flow content-flow earnings-flow payout-flow payout-fail-flow kyc-flow --config apps/web/playwright.config.ts
```
Expected: all PASS. If any fail, the failure must be diagnosed against Global Constraints (most
likely cause: an accidentally-changed `data-testid` or an element hidden/moved out of the DOM
that a spec's selector depended on) — fix the CSS/JSX, not the spec.

- [ ] **Step 4: Manual visual check with Playwright MCP**

Navigate to `/portal/creator`, confirm: passport header shows name/country/status stamp; tab
strip shows all 5 sections with the campaigns badge; icon rail shows globe/bell/theme/logout;
KYC and "Thu nhập chờ đối soát" KPI cards show tilted stamps, the other two do not. Toggle
dark/light — confirm both render with readable contrast (no leftover white flashes). Switch
VN/PH — confirm `--mkt` accent (existing per-market color) still layers correctly on top of the
new palette. Open "Nộp nội dung" modal — confirm it reads the new palette (dark navy card, not
the old blue-purple).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/portal/creator/page.tsx
git commit -m "feat(portal): apply passport theme to Creator dashboard"
```

---

## Self-Review Notes

- **Spec coverage**: all 5 numbered points from the design doc's §3 (header, tabs, rail, KPI
  stamps, panel colors-only) map to Task 2 (header/tabs/rail), Task 3 (KPI stamps), Task 1 (panel
  colors via CSS var inheritance — no code change needed for `Panel`/`MoneySpine`/`Btn`/`Chip`
  since they already consume the overridden vars).
- **Constraint coverage**: `data-testid` preservation and other-4-dashboards regression are each
  a named test step in every task, not just Task 4.
- **Type consistency**: `Shell`'s new `variant?: "passport"` and `kycOk?: boolean`, `Kpi`'s new
  `stamp?: { text: string; ok?: boolean }` are the only new types introduced; both are optional
  and referenced identically across Tasks 2-4.
- **Rollout note (not part of this plan)**: applying the same variant to Ops/Admin/Finance/Global
  later is out of scope here — this plan intentionally stops at Creator per the approved design
  doc's phased scope.
