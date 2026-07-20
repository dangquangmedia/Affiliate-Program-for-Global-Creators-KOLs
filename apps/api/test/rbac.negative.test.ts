import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import "../src/load-env";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/http-exception.filter";

// N17 — Bộ negative tests gom rõ 3 lớp phòng thủ (đọc 1 file thấy hết cho buổi hỏi đáp):
//  A. CÁCH LY NƯỚC (bài toán #1): staff nước khác đụng tài nguyên → 404 "không lộ tồn tại".
//  B. SAI VAI (RBAC): thiếu vai đúng → 403 (route chỉ là ý định; server đối chiếu role_assignment).
//  C. TRANSITION SAI (state machine): xử lý 2 lần / khoá 2 lần → 409 (claim WHERE state=...).

let app: INestApplication;
let baseUrl: string;
let opsVn: string;
let opsPh: string;
let adminVn: string;
let financeVn: string;
let financePh: string;
let globalAdmin: string;

const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });
const jsonH = (t: string): Record<string, string> => ({ "content-type": "application/json", ...bearer(t) });
const status = async (url: string, init?: RequestInit): Promise<number> => (await fetch(url, init)).status;

async function login(email: string): Promise<string> {
  const r = await fetch(`${baseUrl}/auth/mock-login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
  return (await r.json()).token;
}

async function approvedCreatorVn(tag: string): Promise<string> {
  const creator = await login(`rbac-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`);
  await fetch(`${baseUrl}/me/country/vn/kyc`, { method: "POST", headers: jsonH(creator), body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }) });
  const kyc = await (await fetch(`${baseUrl}/me/country/vn/kyc`, { headers: bearer(creator) })).json();
  await fetch(`${baseUrl}/ops/vn/kyc/${kyc.caseId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }) });
  return creator;
}

// Tạo 1 submission VN đang chờ duyệt (SUBMITTED). Trả token creator + id submission + id campaign.
async function submissionVn(tag: string): Promise<{ creator: string; submissionId: string; campaignId: string }> {
  const creator = await approvedCreatorVn(tag);
  const campaignId = (await (await fetch(`${baseUrl}/markets/vn/campaigns`, { method: "POST", headers: jsonH(adminVn), body: JSON.stringify({ title: `rbac-${tag}-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: 500000, slotsTotal: 3 }) })).json()).id;
  await fetch(`${baseUrl}/markets/vn/campaigns/${campaignId}/join`, { method: "POST", headers: bearer(creator) });
  await fetch(`${baseUrl}/me/country/vn/campaigns/${campaignId}/content`, { method: "POST", headers: jsonH(creator), body: JSON.stringify({ url: "https://www.tiktok.com/@a/video/1", caption: "x #t" }) });
  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${campaignId}/content`, { headers: bearer(creator) })).json();
  return { creator, submissionId: mine.submissions[0].id, campaignId };
}

// Đưa 1 creator VN tới số dư AVAILABLE + 1 batch đã tạo (OPEN). Trả token + batchId.
async function openBatchVn(tag: string): Promise<{ creator: string; batchId: string }> {
  const { creator, submissionId } = await submissionVn(tag);
  await fetch(`${baseUrl}/ops/vn/content/${submissionId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "APPROVE" }) });
  const batch = await (await fetch(`${baseUrl}/ops/vn/reconciliation`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({}) })).json();
  return { creator, batchId: batch.id };
}

// Đưa tới 1 lệnh rút PROCESSING của VN. Trả token creator + payoutId.
async function processingPayoutVn(tag: string): Promise<{ creator: string; payoutId: string }> {
  const { creator, batchId } = await openBatchVn(tag);
  await fetch(`${baseUrl}/ops/vn/reconciliation/${batchId}/lock`, { method: "POST", headers: bearer(financeVn) });
  const otp = await (await fetch(`${baseUrl}/me/country/vn/payouts/otp`, { method: "POST", headers: bearer(creator) })).json();
  const payout = await (await fetch(`${baseUrl}/me/country/vn/payouts`, { method: "POST", headers: jsonH(creator), body: JSON.stringify({ amountMinor: 450000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() }) })).json();
  return { creator, payoutId: payout.id };
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  opsVn = await login("ops.vn@demo.affiliate.gl");
  opsPh = await login("ops.ph@demo.affiliate.gl");
  adminVn = await login("admin.vn@demo.affiliate.gl");
  financeVn = await login("finance.vn@demo.affiliate.gl");
  financePh = await login("finance.ph@demo.affiliate.gl");
  globalAdmin = await login("global.admin@demo.affiliate.gl");
});

after(async () => {
  await app.close();
});

// ===== A. Cách ly nước — staff nước KHÁC đụng tài nguyên → 404 (không lộ tồn tại) =====

test("A1: Ops PH reviews a VN KYC case -> 404", async () => {
  const creator = await login(`rbac-kyc-${Date.now()}@example.com`);
  await fetch(`${baseUrl}/me/country/vn/kyc`, { method: "POST", headers: jsonH(creator), body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }) });
  const kyc = await (await fetch(`${baseUrl}/me/country/vn/kyc`, { headers: bearer(creator) })).json();
  // Ops PH gọi route PH của MÌNH nhưng caseId thuộc VN -> 404.
  const s = await status(`${baseUrl}/ops/ph/kyc/${kyc.caseId}/review`, { method: "POST", headers: jsonH(opsPh), body: JSON.stringify({ decisions: [{ key: "fullName", decision: "ACCEPT" }] }) });
  assert.equal(s, 404);
});

test("A2: Ops PH reviews a VN content submission -> 404", async () => {
  const { submissionId } = await submissionVn("iso-content");
  const s = await status(`${baseUrl}/ops/ph/content/${submissionId}/review`, { method: "POST", headers: jsonH(opsPh), body: JSON.stringify({ decision: "APPROVE" }) });
  assert.equal(s, 404);
});

test("A3: Finance PH locks a VN reconciliation batch -> 404", async () => {
  const { batchId } = await openBatchVn("iso-batch");
  const s = await status(`${baseUrl}/ops/ph/reconciliation/${batchId}/lock`, { method: "POST", headers: bearer(financePh) });
  assert.equal(s, 404);
});

test("A4: Finance PH settles a VN payout -> 404", async () => {
  const { payoutId } = await processingPayoutVn("iso-payout");
  const s = await status(`${baseUrl}/ops/ph/payouts/${payoutId}/settle`, { method: "POST", headers: jsonH(financePh), body: JSON.stringify({ result: "SUCCESS" }) });
  assert.equal(s, 404);
});

// ===== B. Sai vai — thiếu vai đúng cho nước → 403 =====

test("B1: creator hits Ops KYC queue -> 403", async () => {
  const creator = await login(`rbac-role-${Date.now()}@example.com`);
  assert.equal(await status(`${baseUrl}/ops/vn/kyc/queue`, { headers: bearer(creator) }), 403);
});

test("B2: Ops (no finance role) creates a reconciliation batch -> 403", async () => {
  assert.equal(await status(`${baseUrl}/ops/vn/reconciliation`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({}) }), 403);
});

test("B3: Finance (no admin role) creates a campaign -> 403", async () => {
  assert.equal(await status(`${baseUrl}/markets/vn/campaigns`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({ title: "x", brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: 100000, slotsTotal: 1 }) }), 403);
});

test("B4: Local Admin reads the global audit log -> 403 (only GLOBAL_ADMIN crosses borders)", async () => {
  assert.equal(await status(`${baseUrl}/admin/audit`, { headers: bearer(adminVn) }), 403);
  assert.equal(await status(`${baseUrl}/admin/audit`, { headers: bearer(globalAdmin) }), 200);
});

// ===== C. Transition sai — xử lý/khoá 2 lần → 409 (claim WHERE state=...) =====

test("C1: double content review -> 409 ALREADY_REVIEWED", async () => {
  const { submissionId } = await submissionVn("txn-content");
  const first = await status(`${baseUrl}/ops/vn/content/${submissionId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "APPROVE" }) });
  assert.equal(first, 201);
  const again = await fetch(`${baseUrl}/ops/vn/content/${submissionId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "APPROVE" }) });
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error.code, "ALREADY_REVIEWED");
});

test("C2: double batch lock -> 409 BATCH_ALREADY_LOCKED", async () => {
  const { batchId } = await openBatchVn("txn-batch");
  assert.equal(await status(`${baseUrl}/ops/vn/reconciliation/${batchId}/lock`, { method: "POST", headers: bearer(financeVn) }), 201);
  const again = await fetch(`${baseUrl}/ops/vn/reconciliation/${batchId}/lock`, { method: "POST", headers: bearer(financeVn) });
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error.code, "BATCH_ALREADY_LOCKED");
});

test("C3: double payout settle -> 409 ALREADY_SETTLED", async () => {
  const { payoutId } = await processingPayoutVn("txn-payout");
  assert.equal(await status(`${baseUrl}/ops/vn/payouts/${payoutId}/settle`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({ result: "SUCCESS" }) }), 201);
  const again = await fetch(`${baseUrl}/ops/vn/payouts/${payoutId}/settle`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({ result: "SUCCESS" }) });
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error.code, "ALREADY_SETTLED");
});
