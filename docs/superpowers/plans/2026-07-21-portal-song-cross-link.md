# "Portal sống" — SP-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến 5 dashboard `/portal` từ tĩnh thành UI thật — nút gọi API thật, các màn nối nhau qua chung DB (Creator nộp link → Ops duyệt → Finance đối soát → tiền về ví Creator, trọn trong /portal).

**Architecture:** Thin-fetch mỗi dashboard, tái dùng 9 client lib có sẵn ở `apps/web/src/lib/*-client.ts`. Cổng chọn vai → `mockLogin` ngầm bằng account seed → lưu phiên `ag_session` (localStorage) → dashboard fetch API thật khi mount, nút gọi endpoint → refetch. Không thêm endpoint backend nào trong SP-1.

**Tech Stack:** Next.js 15 (App Router, client components), TypeScript, fetch qua client lib, Playwright E2E (test thật, không có unit test cho web).

## Global Constraints

- **Không thêm/sửa backend** trong SP-1 — chỉ nối frontend vào endpoint đã có.
- **Không sửa `/mockup`** — giữ nguyên làm phòng thí nghiệm luồng.
- **/portal giữ tiếng Việt** — i18n VI/EN vẫn hoãn (điểm 3 defer trước đó).
- **Phiên:** `saveSession`/`loadSession` từ `../../../lib/auth-client`, key localStorage `ag_session`. Đổi vai = `saveSession` phiên mới **trước khi** điều hướng.
- **Market:** staff (Ops/Admin/Finance) **khoá theo nước của account seed**; Creator chọn VN/PH. Global Admin vượt biên giới (`country_id NULL`).
- **Account seed** (trong `apps/api/prisma/seed.sql`): `ops.vn@`/`ops.ph@`, `admin.vn@`/`admin.ph@`, `finance.vn@`/`finance.ph@`, `global.admin@` — đuôi `demo.affiliate.gl`.
- **Client lib có forbidden/unauthorized guard** — trả `{forbidden:true}`/`{unauthorized:true}`; UI phải kiểm `"forbidden" in res` trước khi dùng, không crash.
- **Test:** `corepack pnpm --filter @affiliate-global/web run test` (Playwright, baseURL :3000, reuseExistingServer). Cần API:3001 + Postgres + web dev:3000 đang chạy. Lint/typecheck: `corepack pnpm run lint`, `corepack pnpm run typecheck`.
- **Commit** mỗi task; nhánh `feat/portal-song-cross-link`.

## File Structure

- Create `apps/web/src/app/portal/session.ts` — `enterAs(role, market)` bootstrap + `roleEmail()` map + `PortalRole` type.
- Modify `apps/web/src/app/portal/page.tsx` — landing "chọn vai" gọi `enterAs`.
- Modify `apps/web/src/app/portal/ui.tsx` — Shell topbar hiện tên user từ session (bỏ tên hardcode); MarketStrip cho Creator có công tắc VN/PH.
- Modify `apps/web/src/app/portal/creator/page.tsx` — fetch + handlers.
- Modify `apps/web/src/app/portal/ops/page.tsx` — fetch + handlers.
- Modify `apps/web/src/app/portal/finance/page.tsx` — fetch + handlers.
- Modify `apps/web/src/app/portal/admin/page.tsx` — fetch + builder handler.
- Modify `apps/web/src/app/portal/global/page.tsx` — audit feed + country config (SP-1 phần đọc).
- Create `apps/web/e2e/portal-role-entry.spec.ts`, `apps/web/e2e/portal-cross-link.spec.ts`.

**Nguyên tắc chung mỗi dashboard:** GIỮ NGUYÊN phần JSX trình bày (KPI, Panel, bảng) — chỉ **thay nguồn dữ liệu** từ mảng hardcode (`KYC_QUEUE`… trong `mockup/data`) sang state fetch thật, và **gắn onClick** vào client lib. Tham khảo màn `/mockup` cùng vai làm khuôn logic (đã chạy đúng).

---

### Task 1: Session bootstrap + landing chọn vai

**Files:**
- Create: `apps/web/src/app/portal/session.ts`
- Modify: `apps/web/src/app/portal/page.tsx` (landing — nút vai)
- Test: `apps/web/e2e/portal-role-entry.spec.ts`

**Interfaces:**
- Consumes: `mockLogin(email, displayName?)`, `saveSession` từ `../../../lib/auth-client`.
- Produces:
  - `type PortalRole = "creator" | "ops" | "admin" | "finance" | "global"`
  - `roleEmail(role: PortalRole, market: "VN"|"PH"): string`
  - `async enterAs(role: PortalRole, market: "VN"|"PH"): Promise<void>` — mockLogin + saveSession + `location.assign("/portal/"+role)`.

- [ ] **Step 1: Viết E2E thất bại** — `apps/web/e2e/portal-role-entry.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("chọn vai Ops -> vào /portal/ops với phiên thật", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-ops").click();
  await expect(page).toHaveURL(/\/portal\/ops/);
  const session = await page.evaluate(() => window.localStorage.getItem("ag_session"));
  expect(session).toContain("token");
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `corepack pnpm --filter @affiliate-global/web run test -- portal-role-entry`
Expected: FAIL (không có testid `enter-ops`).

- [ ] **Step 3: Tạo `session.ts`**

```ts
import { mockLogin, saveSession } from "../../lib/auth-client";

export type PortalRole = "creator" | "ops" | "admin" | "finance" | "global";
export type PortalMarket = "VN" | "PH";

// Map vai + nước -> account seed (apps/api/prisma/seed.sql). Creator = user demo tạo mới theo nước.
export function roleEmail(role: PortalRole, market: PortalMarket): string {
  const m = market.toLowerCase();
  if (role === "global") return "global.admin@demo.affiliate.gl";
  if (role === "creator") return `creator.${m}@demo.affiliate.gl`;
  return `${role}.${m}@demo.affiliate.gl`; // ops/admin/finance
}

const LABEL: Record<PortalRole, string> = {
  creator: "Creator", ops: "Local Ops", admin: "Local Admin",
  finance: "Local Finance", global: "Global Admin",
};

export async function enterAs(role: PortalRole, market: PortalMarket): Promise<void> {
  const email = roleEmail(role, market);
  saveSession(await mockLogin(email, `${LABEL[role]} ${role === "global" ? "" : market}`.trim()));
  // nhớ nước đang chọn để dashboard đọc lại
  window.localStorage.setItem("ag_pref_market", market);
  window.location.assign(`/portal/${role}`);
}
```

- [ ] **Step 4: Nối nút ở landing `page.tsx`**

Tại mỗi nút chọn vai trong `apps/web/src/app/portal/page.tsx`, thêm `data-testid` + `onClick`. Ví dụ khối Ops (giữ nguyên style, chỉ thêm handler):

```tsx
// import ở đầu file:
import { enterAs } from "./session";
// nút vai (lặp cho creator/ops/admin/finance/global; market mặc định "VN", riêng nút có thể cho chọn VN/PH sau):
<button data-testid="enter-ops" onClick={() => void enterAs("ops", "VN")}>… Local Ops …</button>
```

- [ ] **Step 5: Chạy E2E — pass**

Run: `corepack pnpm --filter @affiliate-global/web run test -- portal-role-entry`
Expected: PASS.

- [ ] **Step 6: Lint + typecheck**

Run: `corepack pnpm run lint && corepack pnpm run typecheck`
Expected: sạch.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/portal/session.ts apps/web/src/app/portal/page.tsx apps/web/e2e/portal-role-entry.spec.ts
git commit -m "feat(portal): cổng chọn vai -> mockLogin ngầm bằng account seed (SP-1 T1)"
```

> **Lưu ý account creator seed:** nếu `creator.vn@`/`creator.ph@` chưa có trong seed, `mockLogin` vẫn **tạo user mới** (upsert theo provider+subject) — hợp lệ, creator là user thường. Không cần sửa seed.

---

### Task 2: Creator dashboard live

**Files:**
- Modify: `apps/web/src/app/portal/creator/page.tsx`
- Test: `apps/web/e2e/portal-creator.spec.ts`

**Interfaces:**
- Consumes: `listCampaigns(market)`, `myParticipations(market)`, `joinCampaign(market,id)`, `submitContent(market,campaignId,url,caption)` (content-client), `getEarnings(market)`, `getWallet(market)`, `requestOtp(market)`, `createPayout(market,{amountMinor,otpId,code,idempotencyKey})`, `getMyKyc(market)`.
- Produces: màn creator có `data-testid` cho các nút để E2E khác dùng: `creator-submit-content`, `creator-request-payout`.

- [ ] **Step 1: Viết E2E thất bại** — `apps/web/e2e/portal-creator.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("creator dashboard fetch campaign thật + nộp content", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-creator").click();
  await expect(page).toHaveURL(/\/portal\/creator/);
  // có ít nhất 1 campaign thật render (seed có campaign VN)
  await expect(page.getByTestId("creator-campaign").first()).toBeVisible();
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `corepack pnpm --filter @affiliate-global/web run test -- portal-creator`
Expected: FAIL (chưa có testid, data còn hardcode).

- [ ] **Step 3: Thêm data-loading + handlers vào `creator/page.tsx`**

Thay phần đọc mảng hardcode bằng state fetch. Thêm gần đầu component (giữ nguyên JSX trình bày phía dưới, chỉ trỏ vào state mới):

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { loadSession } from "../../../lib/auth-client";
import { listCampaigns, myParticipations, joinCampaign, type CampaignSummary, type Participation } from "../../../lib/campaign-client";
import { submitContent } from "../../../lib/content-client";
import { getEarnings, type EarningsDashboard } from "../../../lib/earnings-client";
import { getWallet, requestOtp, createPayout, type Wallet } from "../../../lib/payout-client";

// bên trong component:
const market = (typeof window !== "undefined" ? window.localStorage.getItem("ag_pref_market") : "VN") === "PH" ? "PH" : "VN";
const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
const [mine, setMine] = useState<Participation[]>([]);
const [earn, setEarn] = useState<EarningsDashboard | null>(null);
const [wallet, setWallet] = useState<Wallet | null>(null);

const load = useCallback(async () => {
  if (!loadSession()) return;
  const [c, p, e, w] = await Promise.all([
    listCampaigns(market), myParticipations(market), getEarnings(market), getWallet(market),
  ]);
  if (!("unauthorized" in c)) setCampaigns(c);
  setMine(p);
  if (!("unauthorized" in e)) setEarn(e);
  if (!("unauthorized" in w)) setWallet(w);
}, [market]);

useEffect(() => { void load(); }, [load]);

async function onJoin(id: string) { await joinCampaign(market, id); await load(); }
async function onSubmit(campaignId: string, url: string, caption: string) {
  await submitContent(market, campaignId, url, caption); await load();
}
async function onPayout(amountMinor: number) {
  const otp = await requestOtp(market);
  if (!otp) return;
  await createPayout(market, { amountMinor, otpId: otp.otpId, code: otp.code, idempotencyKey: crypto.randomUUID() });
  await load();
}
```

Trong JSX: render `campaigns.map(...)` với `data-testid="creator-campaign"` cho mỗi thẻ, nút Join `onClick={() => void onJoin(c.id)}`; nút nộp content `data-testid="creator-submit-content"` mở form gọi `onSubmit`; nút rút `data-testid="creator-request-payout"` gọi `onPayout(wallet.withdrawableMinor)`. Thay mọi số KPI hardcode bằng `earn`/`wallet`.

- [ ] **Step 4: Thêm `data-testid="enter-creator"` ở landing** (nếu Task 1 chưa thêm cho vai creator) và chạy E2E.

Run: `corepack pnpm --filter @affiliate-global/web run test -- portal-creator`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck**

Run: `corepack pnpm run lint && corepack pnpm run typecheck`
Expected: sạch.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/portal/creator/page.tsx apps/web/src/app/portal/page.tsx apps/web/e2e/portal-creator.spec.ts
git commit -m "feat(portal): creator dashboard fetch API thật + join/submit/payout (SP-1 T2)"
```

---

### Task 3: Ops dashboard live (hiện link content thật + duyệt)

**Files:**
- Modify: `apps/web/src/app/portal/ops/page.tsx`
- Test: `apps/web/e2e/portal-ops.spec.ts`

**Interfaces:**
- Consumes: `getKycQueue(market)`, `reviewKyc(market,caseId,decisions)`, `contentQueue(market)`, `reviewContent(market,submissionId,decision,reason?)`.
- Produces: nút `data-testid="ops-approve-content"` trên mỗi item content.

- [ ] **Step 1: Viết E2E thất bại** — `apps/web/e2e/portal-ops.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("ops dashboard fetch content queue thật", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-ops").click();
  await expect(page).toHaveURL(/\/portal\/ops/);
  // queue là danh sách thật (có thể rỗng) — testid container phải tồn tại
  await expect(page.getByTestId("ops-content-queue")).toBeVisible();
});
```

- [ ] **Step 2: Chạy fail**

Run: `corepack pnpm --filter @affiliate-global/web run test -- portal-ops`
Expected: FAIL.

- [ ] **Step 3: Thay hardcode `KYC_QUEUE`/`CONTENT_QUEUE` bằng fetch trong `ops/page.tsx`**

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { getKycQueue, reviewKyc, type KycQueueItem } from "../../../lib/kyc-client";
import { contentQueue, reviewContent, type ContentQueueItem } from "../../../lib/content-client";

const market = "VN"; // Ops seed VN; nếu vào bằng ops.ph@ thì đọc từ ag_pref_market
const [kyc, setKyc] = useState<KycQueueItem[]>([]);
const [content, setContent] = useState<ContentQueueItem[]>([]);

const load = useCallback(async () => {
  const [k, c] = await Promise.all([getKycQueue(market), contentQueue(market)]);
  setKyc("forbidden" in k ? [] : k);
  setContent("forbidden" in c ? [] : c);
}, [market]);
useEffect(() => { void load(); }, [load]);

async function approveContent(id: string) { await reviewContent(market, id, "APPROVE"); await load(); }
async function rejectContent(id: string, reason: string) { await reviewContent(market, id, "REJECT", reason); await load(); }
async function decideKyc(caseId: string, decisions: { key: string; decision: "ACCEPT" | "REJECT" }[]) {
  await reviewKyc(market, caseId, decisions); await load();
}
```

Trong JSX: bảng content bọc `data-testid="ops-content-queue"`; mỗi dòng render `c.url` (link thật của creator) + nút Approve `data-testid="ops-approve-content"` gọi `approveContent(c.id)`, nút Reject gọi `rejectContent`. Bảng KYC gọi `decideKyc`. Xoá import `KYC_QUEUE, CONTENT_QUEUE` khỏi `mockup/data`.

- [ ] **Step 4: Chạy E2E — pass**

Run: `corepack pnpm --filter @affiliate-global/web run test -- portal-ops`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck** — `corepack pnpm run lint && corepack pnpm run typecheck` → sạch.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/portal/ops/page.tsx apps/web/e2e/portal-ops.spec.ts
git commit -m "feat(portal): ops dashboard fetch KYC/content queue thật + duyệt (SP-1 T3)"
```

---

### Task 4: Finance dashboard live (đối soát + payout)

**Files:**
- Modify: `apps/web/src/app/portal/finance/page.tsx`
- Test: `apps/web/e2e/portal-finance.spec.ts`

**Interfaces:**
- Consumes: `listBatches(market)`, `createBatch(market,period?)`, `lockBatch(market,batchId)`, `payoutQueue(market)`, `payoutHolds(market)`, `settlePayout(market,id,"SUCCESS"|"FAIL")`, `resolveHold(market,id,result)`.
- Produces: testid `finance-create-batch`, `finance-payout-queue`.

- [ ] **Step 1: Viết E2E thất bại** — `apps/web/e2e/portal-finance.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("finance dashboard fetch batch + payout queue thật", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-finance").click();
  await expect(page).toHaveURL(/\/portal\/finance/);
  await expect(page.getByTestId("finance-payout-queue")).toBeVisible();
});
```

- [ ] **Step 2: Chạy fail** — `corepack pnpm --filter @affiliate-global/web run test -- portal-finance` → FAIL.

- [ ] **Step 3: Thay hardcode bằng fetch trong `finance/page.tsx`**

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { listBatches, createBatch, lockBatch, type ReconBatch } from "../../../lib/reconciliation-client";
import { payoutQueue, payoutHolds, settlePayout, resolveHold, type PayoutQueueItem } from "../../../lib/payout-client";

const market = "VN"; // finance seed VN (đọc ag_pref_market nếu ph)
const [batches, setBatches] = useState<ReconBatch[]>([]);
const [queue, setQueue] = useState<PayoutQueueItem[]>([]);
const [holds, setHolds] = useState<PayoutQueueItem[]>([]);

const load = useCallback(async () => {
  const [b, q, h] = await Promise.all([listBatches(market), payoutQueue(market), payoutHolds(market)]);
  setBatches("forbidden" in b ? [] : b);
  setQueue("forbidden" in q ? [] : q);
  setHolds("forbidden" in h ? [] : h);
}, [market]);
useEffect(() => { void load(); }, [load]);

async function onCreateBatch() { await createBatch(market); await load(); }
async function onLock(id: string) { await lockBatch(market, id); await load(); }
async function onSettle(id: string, ok: boolean) { await settlePayout(market, id, ok ? "SUCCESS" : "FAIL"); await load(); }
async function onResolve(id: string, ok: boolean) { await resolveHold(market, id, ok ? "SUCCESS" : "FAIL"); await load(); }
```

JSX: nút "Tạo batch" `data-testid="finance-create-batch"` gọi `onCreateBatch`; mỗi batch có nút Lock gọi `onLock`; bảng payout `data-testid="finance-payout-queue"` với nút "Thành công"/"Thất bại (hoàn)" gọi `onSettle`; bảng holds gọi `onResolve`.

- [ ] **Step 4: Chạy E2E — pass** — `corepack pnpm --filter @affiliate-global/web run test -- portal-finance` → PASS.

- [ ] **Step 5: Lint + typecheck** → sạch.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/portal/finance/page.tsx apps/web/e2e/portal-finance.spec.ts
git commit -m "feat(portal): finance dashboard đối soát + payout thật (SP-1 T4)"
```

---

### Task 5: Admin dashboard live (campaign builder)

**Files:**
- Modify: `apps/web/src/app/portal/admin/page.tsx`
- Test: `apps/web/e2e/portal-admin.spec.ts`

**Interfaces:**
- Consumes: `listCampaigns(market)`, `createCampaign(market, input: CreateCampaignInput)` với `input = { title, brand, platform, requiredHashtag, brief, rewardMinor, slotsTotal }`.
- Produces: testid `admin-create-campaign`.

- [ ] **Step 1: Viết E2E thất bại** — `apps/web/e2e/portal-admin.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("admin tạo campaign -> xuất hiện trong danh sách", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-admin").click();
  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByTestId("admin-campaign-list")).toBeVisible();
});
```

- [ ] **Step 2: Chạy fail** → FAIL.

- [ ] **Step 3: Thay hardcode + thêm builder handler trong `admin/page.tsx`**

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { listCampaigns, createCampaign, type CampaignSummary, type CreateCampaignInput } from "../../../lib/campaign-client";

const market = "VN"; // admin seed VN
const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
const load = useCallback(async () => {
  const c = await listCampaigns(market);
  if (!("unauthorized" in c)) setCampaigns(c);
}, [market]);
useEffect(() => { void load(); }, [load]);

async function onCreate(input: CreateCampaignInput) { await createCampaign(market, input); await load(); }
```

JSX: danh sách campaign `data-testid="admin-campaign-list"` render `campaigns`; form builder (title/brand/platform/hashtag/brief/rewardMinor/slotsTotal) nút submit `data-testid="admin-create-campaign"` gọi `onCreate`.

- [ ] **Step 4: Chạy E2E — pass** → PASS.

- [ ] **Step 5: Lint + typecheck** → sạch.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/portal/admin/page.tsx apps/web/e2e/portal-admin.spec.ts
git commit -m "feat(portal): admin dashboard campaign builder thật (SP-1 T5)"
```

---

### Task 6: Global dashboard live — audit feed + country config (SP-1 phần đọc)

**Files:**
- Modify: `apps/web/src/app/portal/global/page.tsx`
- Test: `apps/web/e2e/portal-global.spec.ts`

**Interfaces:**
- Consumes: `listAudit(market?)` từ `../../../lib/audit-client` (không tham số = toàn cục); `listMyCountries()` từ `../../../lib/country-client` cho phần cấu hình (đọc).
- Produces: testid `global-audit-feed`. Nav chừa mục "Quản lý quyền" + "Doanh thu tổng" hiện nhãn "đang phát triển (SP-2)".

- [ ] **Step 1: Viết E2E thất bại** — `apps/web/e2e/portal-global.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("global admin thấy audit feed toàn cục", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-global").click();
  await expect(page).toHaveURL(/\/portal\/global/);
  await expect(page.getByTestId("global-audit-feed")).toBeVisible();
});
```

- [ ] **Step 2: Chạy fail** → FAIL.

- [ ] **Step 3: Thêm fetch audit + config vào `global/page.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { listAudit, type AuditEvent } from "../../../lib/audit-client";

const [events, setEvents] = useState<AuditEvent[]>([]);
useEffect(() => {
  void (async () => {
    const res = await listAudit(); // toàn cục — global.admin có quyền cross-border
    if (!("forbidden" in res)) setEvents(res);
  })();
}, []);
```

JSX: bảng audit `data-testid="global-audit-feed"` render `events` (thời gian, actor, action, nước, target). Mục nav "Quản lý quyền" / "Doanh thu tổng" render placeholder `<Note>Đang phát triển — SP-2</Note>`.

- [ ] **Step 4: Chạy E2E — pass** → PASS.

- [ ] **Step 5: Lint + typecheck** → sạch.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/portal/global/page.tsx apps/web/e2e/portal-global.spec.ts
git commit -m "feat(portal): global dashboard audit feed toàn cục + chừa chỗ SP-2 (SP-1 T6)"
```

---

### Task 7: Capstone — E2E cross-link trọn spine trong /portal

**Files:**
- Create: `apps/web/e2e/portal-cross-link.spec.ts`
- Modify (nếu thiếu testid): các dashboard ở Task 2–4.

**Interfaces:**
- Consumes: mọi testid đã tạo (`enter-*`, `creator-submit-content`, `ops-approve-content`, `finance-create-batch`, `finance-payout-queue`). Dùng `page.evaluate` + client API để dựng dữ liệu nền (campaign + KYC approved) giống pattern `payout-fail-flow.spec.ts`.

- [ ] **Step 1: Viết E2E cross-link** — `apps/web/e2e/portal-cross-link.spec.ts`

```ts
import { test, expect } from "@playwright/test";

// Creator (portal) nộp content -> Ops (portal) thấy & approve -> earning PENDING ->
// Finance (portal) tạo batch + lock + payout SUCCESS -> tiền phản ánh ở ví Creator.
test("cross-link money spine trọn trong /portal", async ({ page }) => {
  // 1) Creator vào, join + nộp content (qua UI hoặc seed nhanh bằng evaluate như payout-fail-flow)
  await page.goto("/portal");
  await page.getByTestId("enter-creator").click();
  await page.getByTestId("creator-submit-content").first().click();
  // … điền url + caption + xác nhận (theo form thật) …

  // 2) Ops vào thấy link, approve
  await page.goto("/portal");
  await page.getByTestId("enter-ops").click();
  await expect(page.getByTestId("ops-content-queue")).toContainText("tiktok"); // link creator
  await page.getByTestId("ops-approve-content").first().click();

  // 3) Finance vào, tạo batch + lock + payout
  await page.goto("/portal");
  await page.getByTestId("enter-finance").click();
  await page.getByTestId("finance-create-batch").click();
  // … lock batch, settle payout SUCCESS …

  // 4) Creator quay lại, ví có payout PAID
  await page.goto("/portal");
  await page.getByTestId("enter-creator").click();
  await expect(page.getByText(/PAID|Đã trả/)).toBeVisible();
});
```

> **Ghi chú thực thi:** bước dựng dữ liệu nền (tạo campaign qua admin, KYC approved) nên làm bằng `page.evaluate` gọi API trực tiếp giống `apps/web/e2e/payout-fail-flow.spec.ts` để test ổn định, thay vì click qua nhiều màn. Điền chi tiết form/selector theo JSX thật lúc code.

- [ ] **Step 2: Chạy — vá testid/flow tới khi pass**

Run: `corepack pnpm --filter @affiliate-global/web run test -- portal-cross-link`
Expected: PASS (có thể phải bổ sung testid còn thiếu ở Task 2–4).

- [ ] **Step 3: Chạy TOÀN BỘ E2E — không hồi quy**

Run: `corepack pnpm --filter @affiliate-global/web run test`
Expected: tất cả spec (cũ + mới) PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/portal-cross-link.spec.ts apps/web/src/app/portal
git commit -m "test(portal): E2E cross-link money spine trọn trong /portal (SP-1 T7)"
```

---

## Self-Review

**Spec coverage:**
- §3.1 session bootstrap → Task 1. §3.2 thin-fetch → Task 2–6. §4.1 Creator → T2. §4.2 Ops (hiện link) → T3. §4.3 Admin → T5. §4.4 Finance → T4. §4.5 Global (SP-1: config+audit) → T6. §5 E2E cross-link → T7. §6 cắt (i18n hoãn, không push, không đập /mockup) → Global Constraints. ✅ đủ.
- SP-2 (RBAC + doanh thu) **không** nằm trong plan này (đúng — spec riêng).

**Placeholder scan:** các đoạn "… điền theo form thật …" trong Task 7 là **có chủ đích** (selector phụ thuộc JSX cuối cùng) và đã kèm ghi chú cách làm (bắt chước `payout-fail-flow.spec.ts`); không phải TODO logic. Các task 1–6 có code cụ thể.

**Type consistency:** tên hàm/tham số khớp client lib thật đã xác minh: `reviewContent(market,submissionId,decision,reason?)`, `createPayout(market,{amountMinor,otpId,code,idempotencyKey})`, `createCampaign(market,CreateCampaignInput)`, `settlePayout/resolveHold(market,id,result)`, `Otp.otpId`, `Wallet.withdrawableMinor`. ✅
