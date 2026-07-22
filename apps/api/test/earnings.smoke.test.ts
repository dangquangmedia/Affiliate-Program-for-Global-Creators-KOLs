import { test, before } from "node:test";
import assert from "node:assert/strict";
import { goApiBaseUrl, sql } from "./go-api-harness";

let baseUrl: string;
let adminVn: string;
let opsVn: string;

const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });
const jsonH = (t: string): Record<string, string> => ({ "content-type": "application/json", ...bearer(t) });

async function login(email: string): Promise<string> {
  const r = await fetch(`${baseUrl}/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return (await r.json()).token;
}

async function approvedCreator(email: string): Promise<string> {
  const token = await login(email);
  await fetch(`${baseUrl}/me/country/vn/kyc`, {
    method: "POST",
    headers: jsonH(token),
    body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }),
  });
  const kyc = await (await fetch(`${baseUrl}/me/country/vn/kyc`, { headers: bearer(token) })).json();
  await fetch(`${baseUrl}/ops/vn/kyc/${kyc.caseId}/review`, {
    method: "POST",
    headers: jsonH(opsVn),
    body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
  });
  return token;
}

// Creator approved, join campaign mới, nộp content, Ops approve -> trả (token, cid, sid).
async function earnFlow(tag: string): Promise<{ token: string; cid: string; sid: string }> {
  const token = await approvedCreator(`n12-${tag}-${Date.now()}@example.com`);
  const cid = (await (
    await fetch(`${baseUrl}/markets/vn/campaigns`, {
      method: "POST",
      headers: jsonH(adminVn),
      body: JSON.stringify({ title: `n12-${tag}-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: 500000, slotsTotal: 3 }),
    })
  ).json()).id;
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, {
    method: "POST",
    headers: jsonH(token),
    body: JSON.stringify({ url: "https://www.tiktok.com/@a/video/1", caption: "x #t" }),
  });
  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { headers: bearer(token) })).json();
  const sid = mine.submissions[0].id;
  await fetch(`${baseUrl}/ops/vn/content/${sid}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "APPROVE" }) });
  return { token, cid, sid };
}

const dashboard = async (token: string) =>
  (await fetch(`${baseUrl}/me/country/vn/earnings`, { headers: bearer(token) })).json();

before(async () => {
  baseUrl = await goApiBaseUrl();
  adminVn = await login("admin.vn@demo.affiliate.gl");
  opsVn = await login("ops.vn@demo.affiliate.gl");
});

test("earnings dashboard requires a session (401)", async () => {
  const res = await fetch(`${baseUrl}/me/country/vn/earnings`);
  assert.equal(res.status, 401);
});

test("approve posts ledger entries: +gross EARNING_ACCRUE and -tax TAX", async () => {
  const { sid } = await earnFlow("ledger");
  const [earning] = await sql<{ id: string }>("SELECT id::text FROM earning WHERE submission_id=$1", [sid]);
  const entries = await sql<{ entryType: string; amountMinor: string }>(
    "SELECT entry_type::text AS \"entryType\", amount_minor::text AS \"amountMinor\" FROM ledger_entry WHERE ref_type='earning' AND ref_id=$1 ORDER BY entry_type",
    [earning.id],
  );
  const byType = Object.fromEntries(entries.map((e) => [e.entryType, BigInt(e.amountMinor)]));
  assert.equal(byType.EARNING_ACCRUE, 500000n); // +gross
  assert.equal(byType.TAX, -50000n); // -tax (VN 10%)
  assert.equal(entries.length, 2);
});

test("dashboard sums Gross/Tax/Net and ledger balance = net", async () => {
  const { token } = await earnFlow("sum");
  const d = await dashboard(token);
  assert.equal(d.summary.totalGrossMinor, 500000);
  assert.equal(d.summary.totalTaxMinor, 50000);
  assert.equal(d.summary.totalNetMinor, 450000);
  assert.equal(d.summary.pendingNetMinor, 450000); // PENDING cho tới khi đối soát (N13)
  assert.equal(d.summary.availableNetMinor, 0);
  assert.equal(d.ledger.balanceMinor, 450000); // sổ cái = gross - tax = net
  assert.equal(d.earnings.length, 1);
  assert.equal(d.earnings[0].netMinor, 450000);
});

test("ledger is append-only proof: entries newest-first with running balance", async () => {
  const { token } = await earnFlow("running");
  const d = await dashboard(token);
  // 2 bút toán: EARNING_ACCRUE rồi TAX. Mới nhất trước -> TAX ở đầu, số dư sau cùng = 450000.
  assert.equal(d.ledger.entries.length, 2);
  assert.equal(d.ledger.entries[0].balanceAfterMinor, 450000); // sau TAX
  assert.equal(d.ledger.entries[1].balanceAfterMinor, 500000); // sau EARNING_ACCRUE
});

test("second approve (double-click) does NOT double the ledger (exactly-once holds)", async () => {
  const { token, sid } = await earnFlow("nodouble");
  // Cố duyệt lần 2 -> 409, sổ cái không nhân đôi.
  const again = await fetch(`${baseUrl}/ops/vn/content/${sid}/review`, {
    method: "POST",
    headers: jsonH(opsVn),
    body: JSON.stringify({ decision: "APPROVE" }),
  });
  assert.equal(again.status, 409);
  const d = await dashboard(token);
  assert.equal(d.ledger.balanceMinor, 450000); // vẫn 1 lần net, không phải 900000
  assert.equal(d.ledger.entries.length, 2);
});

test("country isolation: VN earnings do not leak into PH dashboard", async () => {
  const { token } = await earnFlow("iso");
  const dVn = await dashboard(token);
  assert.ok(dVn.earnings.length >= 1);
  const dPh = await (await fetch(`${baseUrl}/me/country/ph/earnings`, { headers: bearer(token) })).json();
  assert.equal(dPh.earnings.length, 0); // hồ sơ PH riêng, không thấy thu nhập VN
  assert.equal(dPh.ledger.balanceMinor, 0);
});
