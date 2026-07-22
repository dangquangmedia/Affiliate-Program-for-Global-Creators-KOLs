import { test, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { goApiBaseUrl } from "./go-api-harness";

// N15 — E2E cả spine tiền trên VN + PH ở tầng API: login → KYC → join → content → approve →
// đối soát → AVAILABLE → rút (OTP + reserve) → provider mock. Chứng minh cùng một bộ code chạy
// đúng cho 2 nước có tiền tệ/thuế/mức tối thiểu khác nhau (VND exp0 thuế 10% / PHP exp2 thuế 8%).

let baseUrl: string;

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

interface MarketFixture {
  market: string;
  reward: number;
  net: number; // gross − floor(gross × tax%)
  min: number;
  currency: string;
}

// Chạy trọn spine cho 1 nước, trả về { token creator, id lệnh rút PROCESSING, net }.
async function runToProcessing(fx: MarketFixture, tag: string): Promise<{ token: string; payoutId: string }> {
  const m = fx.market;
  const adminT = await login(`admin.${m}@demo.affiliate.gl`);
  const opsT = await login(`ops.${m}@demo.affiliate.gl`);
  const financeT = await login(`finance.${m}@demo.affiliate.gl`);
  const creator = await login(`spine-${m}-${tag}-${Date.now()}@example.com`);

  // KYC → Ops duyệt.
  await fetch(`${baseUrl}/me/country/${m}/kyc`, {
    method: "POST",
    headers: jsonH(creator),
    body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }),
  });
  const kyc = await (await fetch(`${baseUrl}/me/country/${m}/kyc`, { headers: bearer(creator) })).json();
  await fetch(`${baseUrl}/ops/${m}/kyc/${kyc.caseId}/review`, {
    method: "POST",
    headers: jsonH(opsT),
    body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
  });

  // Campaign → join → content → Ops duyệt → earning PENDING.
  const cid = (await (
    await fetch(`${baseUrl}/markets/${m}/campaigns`, {
      method: "POST",
      headers: jsonH(adminT),
      body: JSON.stringify({ title: `spine-${m}-${tag}-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: fx.reward, slotsTotal: 3 }),
    })
  ).json()).id;
  await fetch(`${baseUrl}/markets/${m}/campaigns/${cid}/join`, { method: "POST", headers: bearer(creator) });
  await fetch(`${baseUrl}/me/country/${m}/campaigns/${cid}/content`, {
    method: "POST",
    headers: jsonH(creator),
    body: JSON.stringify({ url: "https://www.tiktok.com/@a/video/1", caption: "x #t" }),
  });
  const mine = await (await fetch(`${baseUrl}/me/country/${m}/campaigns/${cid}/content`, { headers: bearer(creator) })).json();
  await fetch(`${baseUrl}/ops/${m}/content/${mine.submissions[0].id}/review`, { method: "POST", headers: jsonH(opsT), body: JSON.stringify({ decision: "APPROVE" }) });

  // Finance đối soát + khoá → AVAILABLE.
  const batch = await (await fetch(`${baseUrl}/ops/${m}/reconciliation`, { method: "POST", headers: jsonH(financeT), body: JSON.stringify({}) })).json();
  await fetch(`${baseUrl}/ops/${m}/reconciliation/${batch.id}/lock`, { method: "POST", headers: bearer(financeT) });

  // Số dư rút được = net.
  const w = await (await fetch(`${baseUrl}/me/country/${m}/wallet`, { headers: bearer(creator) })).json();
  assert.equal(w.withdrawableMinor, fx.net, `[${m}] withdrawable phải = net`);
  assert.equal(w.currency, fx.currency);

  // Rút toàn bộ net qua OTP + reserve → PROCESSING.
  const otp = await (await fetch(`${baseUrl}/me/country/${m}/payouts/otp`, { method: "POST", headers: bearer(creator) })).json();
  const payout = await (
    await fetch(`${baseUrl}/me/country/${m}/payouts`, {
      method: "POST",
      headers: jsonH(creator),
      body: JSON.stringify({ amountMinor: fx.net, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() }),
    })
  ).json();
  assert.equal(payout.state, "PROCESSING", `[${m}] rút xong phải PROCESSING`);
  return { token: creator, payoutId: payout.id };
}

const FIXTURES: MarketFixture[] = [
  { market: "vn", reward: 500000, net: 450000, min: 200000, currency: "VND" },
  { market: "ph", reward: 100000, net: 92000, min: 50000, currency: "PHP" },
];

before(async () => {
  baseUrl = await goApiBaseUrl();
});

for (const fx of FIXTURES) {
  test(`[${fx.market.toUpperCase()}] full money spine SUCCESS -> PAID`, async () => {
    const { token, payoutId } = await runToProcessing(fx, "ok");
    const financeT = await login(`finance.${fx.market}@demo.affiliate.gl`);
    const res = await fetch(`${baseUrl}/ops/${fx.market}/payouts/${payoutId}/settle`, {
      method: "POST",
      headers: jsonH(financeT),
      body: JSON.stringify({ result: "SUCCESS" }),
    });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).state, "PAID");

    const w = await (await fetch(`${baseUrl}/me/country/${fx.market}/wallet`, { headers: bearer(token) })).json();
    assert.equal(w.withdrawableMinor, 0); // đã trả, giữ nguyên (không hoàn)
    assert.ok(w.payouts.some((p: { id: string; state: string }) => p.id === payoutId && p.state === "PAID"));
  });

  test(`[${fx.market.toUpperCase()}] full money spine FAIL -> released, withdrawable restored`, async () => {
    const { token, payoutId } = await runToProcessing(fx, "fail");
    const financeT = await login(`finance.${fx.market}@demo.affiliate.gl`);
    const res = await fetch(`${baseUrl}/ops/${fx.market}/payouts/${payoutId}/settle`, {
      method: "POST",
      headers: jsonH(financeT),
      body: JSON.stringify({ result: "FAIL" }),
    });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).state, "FAILED_RELEASED");

    const w = await (await fetch(`${baseUrl}/me/country/${fx.market}/wallet`, { headers: bearer(token) })).json();
    assert.equal(w.withdrawableMinor, fx.net); // hoàn về số dư -> rút lại được
  });
}
