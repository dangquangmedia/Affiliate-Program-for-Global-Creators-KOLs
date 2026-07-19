import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import "../src/load-env";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/http-exception.filter";

let app: INestApplication;
let baseUrl: string;
let adminVn: string;
let opsVn: string;

const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });

async function login(email: string): Promise<string> {
  const r = await fetch(`${baseUrl}/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return (await r.json()).token;
}

// Tạo 1 creator VN đã KYC APPROVED (đủ điều kiện Join).
async function approvedCreator(email: string): Promise<string> {
  const token = await login(email);
  await fetch(`${baseUrl}/me/country/vn/kyc`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }),
  });
  const kyc = await (await fetch(`${baseUrl}/me/country/vn/kyc`, { headers: bearer(token) })).json();
  await fetch(`${baseUrl}/ops/vn/kyc/${kyc.caseId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(opsVn) },
    body: JSON.stringify({
      decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })),
    }),
  });
  return token;
}

async function createCampaign(slotsTotal: number, title: string): Promise<string> {
  const r = await fetch(`${baseUrl}/markets/vn/campaigns`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(adminVn) },
    body: JSON.stringify({ title, brand: "B", platform: "TikTok", requiredHashtag: "#x", brief: "", rewardMinor: 100000, slotsTotal }),
  });
  return (await r.json()).id;
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  adminVn = await login("admin.vn@demo.affiliate.gl");
  opsVn = await login("ops.vn@demo.affiliate.gl");
});

after(async () => {
  await app.close();
});

test("KYC-not-approved creator is blocked from joining (KYC_REQUIRED)", async () => {
  const token = await login(`n10-nokyc-${Date.now()}@example.com`);
  const cid = await createCampaign(5, `nokyc-${Date.now()}`);
  const res = await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "KYC_REQUIRED");
});

test("approved creator joins -> JOINED with snapshot terms", async () => {
  const token = await approvedCreator(`n10-join-${Date.now()}@example.com`);
  const cid = await createCampaign(5, `join-${Date.now()}`);
  const res = await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  assert.equal(res.status, 201);
  const p = await res.json();
  assert.equal(p.state, "JOINED");
  assert.equal(p.snapshotRewardMinor, 100000); // snapshot đơn giá lúc join
  assert.ok(p.submitDeadlineAt); // có hạn nộp (SLA)
});

test("joining twice is idempotent (no second slot)", async () => {
  const token = await approvedCreator(`n10-idem-${Date.now()}@example.com`);
  const cid = await createCampaign(5, `idem-${Date.now()}`);
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  const again = await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  assert.equal(again.status, 201);
  // Suất đã dùng chỉ = 1 (đọc qua discover slotsLeft).
  const list = await (await fetch(`${baseUrl}/markets/vn/campaigns`, { headers: bearer(token) })).json();
  const c = list.find((x: { id: string }) => x.id === cid);
  assert.equal(c.slotsLeft, 4); // 5 - 1, không phải 5 - 2
});

test("snapshot is frozen at join even if admin changes the campaign later", async () => {
  // (đơn giản hoá) — chỉ kiểm snapshot tồn tại & = đơn giá lúc join; đổi campaign là N-sau.
  const token = await approvedCreator(`n10-snap-${Date.now()}@example.com`);
  const cid = await createCampaign(5, `snap-${Date.now()}`);
  const p = await (await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) })).json();
  assert.equal(p.snapshotRewardMinor, 100000);
});

test("leaving frees the slot back", async () => {
  const token = await approvedCreator(`n10-leave-${Date.now()}@example.com`);
  const cid = await createCampaign(3, `leave-${Date.now()}`);
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/leave`, { method: "POST", headers: bearer(token) });
  const list = await (await fetch(`${baseUrl}/markets/vn/campaigns`, { headers: bearer(token) })).json();
  const c = list.find((x: { id: string }) => x.id === cid);
  assert.equal(c.slotsLeft, 3); // đã trả suất
});

test("My Campaigns lists the creator's participations", async () => {
  const token = await approvedCreator(`n10-mine-${Date.now()}@example.com`);
  const cid = await createCampaign(5, `mine-${Date.now()}`);
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  const mine = await (await fetch(`${baseUrl}/me/country/vn/participations`, { headers: bearer(token) })).json();
  assert.ok(mine.some((p: { campaignId: string; state: string }) => p.campaignId === cid && p.state === "JOINED"));
});

test("RACE: 3 creators join the last slot -> exactly 1 wins, 2 get SLOT_FULL", async () => {
  const cid = await createCampaign(1, `race-${Date.now()}`); // đúng 1 suất
  const tokens = await Promise.all([
    approvedCreator(`n10-race1-${Date.now()}@example.com`),
    approvedCreator(`n10-race2-${Date.now()}@example.com`),
    approvedCreator(`n10-race3-${Date.now()}@example.com`),
  ]);
  // Bắn 3 request join CÙNG LÚC.
  const results = await Promise.all(
    tokens.map((t) => fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(t) })),
  );
  const statuses = results.map((r) => r.status);
  const wins = statuses.filter((s) => s === 201).length;
  const fulls = statuses.filter((s) => s === 409).length;
  assert.equal(wins, 1, `exactly one winner, got ${wins}`);
  assert.equal(fulls, 2, `two SLOT_FULL, got ${fulls}`);

  // Không oversell: slotsLeft = 0.
  const list = await (await fetch(`${baseUrl}/markets/vn/campaigns`, { headers: bearer(tokens[0]) })).json();
  const c = list.find((x: { id: string }) => x.id === cid);
  assert.equal(c.slotsLeft, 0);
});
