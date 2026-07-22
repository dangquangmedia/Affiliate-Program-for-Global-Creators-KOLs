import { test, before } from "node:test";
import assert from "node:assert/strict";
import { goApiBaseUrl } from "./go-api-harness";

let baseUrl: string;
let creatorToken: string;
let adminVnToken: string;
let opsVnToken: string;

async function login(email: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return (await res.json()).token;
}
const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });

before(async () => {
  baseUrl = await goApiBaseUrl();
  creatorToken = await login(`n9-creator-${Date.now()}@example.com`);
  adminVnToken = await login("admin.vn@demo.affiliate.gl"); // seed: LOCAL_ADMIN VN
  opsVnToken = await login("ops.vn@demo.affiliate.gl"); // seed: LOCAL_OPS VN (không phải admin)
});

test("discover lists only VN campaigns for /vn (country isolation)", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/campaigns`, { headers: bearer(creatorToken) });
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.ok(list.length >= 3);
  assert.ok(list.every((c: { currency: string }) => c.currency === "VND"));
  const titles = list.map((c: { title: string }) => c.title);
  assert.ok(titles.includes("Review son mùa hè"));
  assert.ok(!titles.includes("Snack taste test")); // campaign PH không lọt vào VN
});

test("a full campaign is derived (slotsLeft<=0), not a stored flag", async () => {
  const list = await (await fetch(`${baseUrl}/markets/vn/campaigns`, { headers: bearer(creatorToken) })).json();
  const cafe = list.find((c: { title: string }) => c.title === "Đánh giá cà phê lon");
  assert.equal(cafe.slotsLeft, 0);
  assert.equal(cafe.full, true);
});

// Dùng THẲNG id seed "Review son mùa hè" (500000 × 50 suất) — tất định, không lẫn campaign do
// builder test tạo cùng tên.
const SEED_SON_VN = "40000000-0000-4000-8000-000000000001";

test("detail exposes the 3-axis reward + derived budget cap", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/campaigns/${SEED_SON_VN}`, { headers: bearer(creatorToken) });
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.reward.triggerType, "CONTENT_APPROVED");
  assert.equal(d.reward.pricingType, "FLAT");
  assert.equal(d.reward.budgetCapMinor, 500000 * 50); // suất × đơn giá
});

test("a VN campaign id under /ph is a controlled 404 (isolation on detail)", async () => {
  const res = await fetch(`${baseUrl}/markets/ph/campaigns/${SEED_SON_VN}`, { headers: bearer(creatorToken) });
  assert.equal(res.status, 404);
});

test("discover requires a session (401)", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/campaigns`);
  assert.equal(res.status, 401);
});

let createdId: string;

test("Local Admin VN creates a campaign with a Phase-1 reward rule", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/campaigns`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(adminVnToken) },
    body: JSON.stringify({
      title: "N9 test campaign",
      brand: "TestBrand",
      platform: "TikTok",
      requiredHashtag: "#N9",
      brief: "brief",
      rewardMinor: 400000,
      slotsTotal: 10,
    }),
  });
  assert.equal(res.status, 201);
  const d = await res.json();
  createdId = d.id;
  assert.equal(d.currency, "VND"); // ép theo nước
  assert.equal(d.reward.budgetCapMinor, 400000 * 10);
  assert.equal(d.full, false);
});

test("the admin-created campaign now shows up in discover", async () => {
  const list = await (await fetch(`${baseUrl}/markets/vn/campaigns`, { headers: bearer(creatorToken) })).json();
  assert.ok(list.some((c: { id: string }) => c.id === createdId));
});

test("a creator (no admin role) cannot create a campaign (403)", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/campaigns`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(creatorToken) },
    body: JSON.stringify({ title: "nope", rewardMinor: 1000, slotsTotal: 1 }),
  });
  assert.equal(res.status, 403);
});

test("Ops (wrong staff role) cannot create a campaign (403)", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/campaigns`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(opsVnToken) },
    body: JSON.stringify({ title: "nope", rewardMinor: 1000, slotsTotal: 1 }),
  });
  assert.equal(res.status, 403);
});

test("Admin VN cannot create a campaign in PH (cross-country 403)", async () => {
  const res = await fetch(`${baseUrl}/markets/ph/campaigns`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(adminVnToken) },
    body: JSON.stringify({ title: "cross", rewardMinor: 1000, slotsTotal: 1 }),
  });
  assert.equal(res.status, 403);
});

test("create rejects invalid input (0 slots -> 400)", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/campaigns`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(adminVnToken) },
    body: JSON.stringify({ title: "bad", rewardMinor: 1000, slotsTotal: 0 }),
  });
  assert.equal(res.status, 400);
});
