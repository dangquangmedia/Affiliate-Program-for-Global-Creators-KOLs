import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import "../src/load-env";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/http-exception.filter";
import { PrismaService } from "../src/prisma.service";

let app: INestApplication;
let baseUrl: string;
let adminVn: string;
let opsVn: string;
let financeVn: string;
let financePh: string;

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

// Creator có số dư AVAILABLE (net 450k) sau khi content được duyệt + Finance đối soát khoá.
async function availableCreator(tag: string): Promise<string> {
  const token = await approvedCreator(`n14-${tag}-${Date.now()}@example.com`);
  const cid = (await (
    await fetch(`${baseUrl}/markets/vn/campaigns`, {
      method: "POST",
      headers: jsonH(adminVn),
      body: JSON.stringify({ title: `n14-${tag}-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: 500000, slotsTotal: 3 }),
    })
  ).json()).id;
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, {
    method: "POST",
    headers: jsonH(token),
    body: JSON.stringify({ url: "https://www.tiktok.com/@a/video/1", caption: "x #t" }),
  });
  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { headers: bearer(token) })).json();
  await fetch(`${baseUrl}/ops/vn/content/${mine.submissions[0].id}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "APPROVE" }) });
  // Finance đối soát + khoá -> AVAILABLE.
  const batch = await (await fetch(`${baseUrl}/ops/vn/reconciliation`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({}) })).json();
  await fetch(`${baseUrl}/ops/vn/reconciliation/${batch.id}/lock`, { method: "POST", headers: bearer(financeVn) });
  return token;
}

const wallet = async (token: string) => (await fetch(`${baseUrl}/me/country/vn/wallet`, { headers: bearer(token) })).json();
const getOtp = async (token: string) => (await fetch(`${baseUrl}/me/country/vn/payouts/otp`, { method: "POST", headers: bearer(token) })).json();
const createPayout = (token: string, body: object) =>
  fetch(`${baseUrl}/me/country/vn/payouts`, { method: "POST", headers: jsonH(token), body: JSON.stringify(body) });

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  adminVn = await login("admin.vn@demo.affiliate.gl");
  opsVn = await login("ops.vn@demo.affiliate.gl");
  financeVn = await login("finance.vn@demo.affiliate.gl");
  financePh = await login("finance.ph@demo.affiliate.gl");
});

after(async () => {
  await app.close();
});

test("wallet requires a session (401)", async () => {
  assert.equal((await fetch(`${baseUrl}/me/country/vn/wallet`)).status, 401);
});

test("available creator sees withdrawable = net (450k) and VN min 200k", async () => {
  const token = await availableCreator("bal");
  const w = await wallet(token);
  assert.equal(w.withdrawableMinor, 450000);
  assert.equal(w.minPayoutMinor, 200000);
  assert.equal(w.currency, "VND");
});

test("request payout with OTP -> PROCESSING, withdrawable drops, ledger reserves -amount", async () => {
  const token = await availableCreator("req");
  const otp = await getOtp(token);
  const res = await createPayout(token, { amountMinor: 450000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() });
  assert.equal(res.status, 201);
  const p = await res.json();
  assert.equal(p.state, "PROCESSING");
  assert.equal(p.amountMinor, 450000);

  const w = await wallet(token);
  assert.equal(w.withdrawableMinor, 0); // đã giữ chỗ hết

  const prisma = app.get(PrismaService);
  const reserve = (await prisma.db.ledgerEntry.findFirst({ where: { refType: "payout", refId: p.id, entryType: "PAYOUT_RESERVE" } })) as { amountMinor: bigint };
  assert.equal(reserve.amountMinor, -450000n);
});

test("amount below country minimum -> 409 BELOW_MIN_PAYOUT", async () => {
  const token = await availableCreator("min");
  const otp = await getOtp(token);
  const res = await createPayout(token, { amountMinor: 100000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "BELOW_MIN_PAYOUT");
});

test("amount above withdrawable -> 409 INSUFFICIENT_BALANCE", async () => {
  const token = await availableCreator("over");
  const otp = await getOtp(token);
  const res = await createPayout(token, { amountMinor: 500000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "INSUFFICIENT_BALANCE");
});

test("wrong OTP code -> 409 OTP_INVALID; reused OTP -> 409 OTP_USED", async () => {
  const token = await availableCreator("otp");
  const otp = await getOtp(token);
  const bad = await createPayout(token, { amountMinor: 300000, otpId: otp.otpId, code: "000000", idempotencyKey: randomUUID() });
  assert.equal(bad.status, 409);
  assert.equal((await bad.json()).error.code, "OTP_INVALID");

  // Dùng OTP đúng 1 lần
  const ok = await createPayout(token, { amountMinor: 300000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() });
  assert.equal(ok.status, 201);
  // Dùng lại OTP đã consume -> OTP_USED (amount >= min để không bị chặn ở BELOW_MIN trước)
  const reuse = await createPayout(token, { amountMinor: 300000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() });
  assert.equal(reuse.status, 409);
  assert.equal((await reuse.json()).error.code, "OTP_USED");
});

test("idempotency: same key twice -> one payout, reserve once", async () => {
  const token = await availableCreator("idem");
  const otp = await getOtp(token);
  const key = randomUUID();
  const first = await (await createPayout(token, { amountMinor: 450000, otpId: otp.otpId, code: otp.code, idempotencyKey: key })).json();
  const second = await (await createPayout(token, { amountMinor: 450000, otpId: otp.otpId, code: otp.code, idempotencyKey: key })).json();
  assert.equal(first.id, second.id); // cùng 1 lệnh
  const count = await app.get(PrismaService).db.payoutRequest.count?.({ where: { idempotencyKey: key } });
  // payoutRequest.count không có trong facade -> kiểm qua ledger: đúng 1 reserve.
  void count;
  const reserves = (await app.get(PrismaService).db.ledgerEntry.findMany({ where: { refType: "payout", refId: first.id, entryType: "PAYOUT_RESERVE" } })) as unknown[];
  assert.equal(reserves.length, 1);
  const w = await wallet(token);
  assert.equal(w.withdrawableMinor, 0); // chỉ trừ 1 lần
});

test("Finance settles SUCCESS -> PAID; double-settle -> 409 ALREADY_SETTLED", async () => {
  const token = await availableCreator("settle");
  const otp = await getOtp(token);
  const payout = await (await createPayout(token, { amountMinor: 450000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() })).json();

  const res = await fetch(`${baseUrl}/ops/vn/payouts/${payout.id}/settle`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({ result: "SUCCESS" }) });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).state, "PAID");

  const again = await fetch(`${baseUrl}/ops/vn/payouts/${payout.id}/settle`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({ result: "SUCCESS" }) });
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error.code, "ALREADY_SETTLED");
});

test("RBAC + isolation: creator cannot settle/queue; Finance PH cannot settle VN payout (404)", async () => {
  const token = await availableCreator("rbac");
  const otp = await getOtp(token);
  const payout = await (await createPayout(token, { amountMinor: 450000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() })).json();

  assert.equal((await fetch(`${baseUrl}/ops/vn/payouts`, { headers: bearer(token) })).status, 403);
  const creatorSettle = await fetch(`${baseUrl}/ops/vn/payouts/${payout.id}/settle`, { method: "POST", headers: jsonH(token), body: JSON.stringify({ result: "SUCCESS" }) });
  assert.equal(creatorSettle.status, 403);

  const phSettle = await fetch(`${baseUrl}/ops/ph/payouts/${payout.id}/settle`, { method: "POST", headers: jsonH(financePh), body: JSON.stringify({ result: "SUCCESS" }) });
  assert.equal(phSettle.status, 404);
});
