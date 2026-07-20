import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import "../src/load-env";
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

// Tạo 1 earning PENDING cho creator mới -> trả (token, earningId).
async function makePendingEarning(tag: string): Promise<{ token: string; earningId: string }> {
  const token = await approvedCreator(`n13-${tag}-${Date.now()}@example.com`);
  const cid = (await (
    await fetch(`${baseUrl}/markets/vn/campaigns`, {
      method: "POST",
      headers: jsonH(adminVn),
      body: JSON.stringify({ title: `n13-${tag}-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: 500000, slotsTotal: 3 }),
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
  const earning = (await app.get(PrismaService).db.earning.findFirst({ where: { submissionId: sid } })) as { id: string };
  return { token, earningId: earning.id };
}

const createBatch = (token: string) =>
  fetch(`${baseUrl}/ops/vn/reconciliation`, { method: "POST", headers: jsonH(token), body: JSON.stringify({}) });
const lockBatch = (token: string, id: string) =>
  fetch(`${baseUrl}/ops/vn/reconciliation/${id}/lock`, { method: "POST", headers: bearer(token) });
const earningStatus = async (id: string): Promise<string> =>
  ((await app.get(PrismaService).db.earning.findFirst({ where: { id } })) as { status: string }).status;

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

test("reconciliation requires LOCAL_FINANCE (creator -> 403, ops -> 403)", async () => {
  const creator = await login(`n13-noauth-${Date.now()}@example.com`);
  assert.equal((await fetch(`${baseUrl}/ops/vn/reconciliation`, { headers: bearer(creator) })).status, 403);
  assert.equal((await fetch(`${baseUrl}/ops/vn/reconciliation`, { headers: bearer(opsVn) })).status, 403);
});

test("create batch gathers PENDING earnings into OPEN batch with lines", async () => {
  const { earningId } = await makePendingEarning("create");
  const res = await createBatch(financeVn);
  assert.equal(res.status, 201);
  const batch = await res.json();
  assert.equal(batch.status, "OPEN");
  assert.ok(batch.lineCount >= 1);
  assert.ok(batch.lines.some((l: { earningId: string }) => l.earningId === earningId), "earning phải nằm trong batch");
  assert.equal(await earningStatus(earningId), "PENDING"); // chưa khoá thì vẫn PENDING
});

test("lock batch -> earnings become AVAILABLE, batch immutable", async () => {
  const { earningId } = await makePendingEarning("lock");
  const batch = await (await createBatch(financeVn)).json();
  const res = await lockBatch(financeVn, batch.id);
  assert.equal(res.status, 201);
  assert.equal((await res.json()).status, "LOCKED");
  assert.equal(await earningStatus(earningId), "AVAILABLE"); // tiền mở để rút
});

test("double-lock -> 409 BATCH_ALREADY_LOCKED", async () => {
  await makePendingEarning("double");
  const batch = await (await createBatch(financeVn)).json();
  await lockBatch(financeVn, batch.id);
  const again = await lockBatch(financeVn, batch.id);
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error.code, "BATCH_ALREADY_LOCKED");
});

test("earning only reconciled once: create batch when nothing pending -> 409", async () => {
  await makePendingEarning("once");
  // Batch #1 gom hết PENDING (kể cả dư từ test trước) rồi khoá.
  const b1 = await (await createBatch(financeVn)).json();
  await lockBatch(financeVn, b1.id);
  // Không còn PENDING -> tạo batch tiếp phải bị từ chối, không tạo batch rỗng.
  const res = await createBatch(financeVn);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "NOTHING_TO_RECONCILE");
});

test("country isolation: Finance PH cannot open a VN batch (404)", async () => {
  await makePendingEarning("iso");
  const batch = await (await createBatch(financeVn)).json();
  // Finance PH mở batch VN qua route PH -> 404 (không lộ tồn tại).
  const res = await fetch(`${baseUrl}/ops/ph/reconciliation/${batch.id}`, { headers: bearer(financePh) });
  assert.equal(res.status, 404);
});

test("dashboard: after lock, net moves PENDING -> AVAILABLE for the creator", async () => {
  const { token } = await makePendingEarning("dash");
  const before = await (await fetch(`${baseUrl}/me/country/vn/earnings`, { headers: bearer(token) })).json();
  assert.equal(before.summary.pendingNetMinor, 450000);
  assert.equal(before.summary.availableNetMinor, 0);

  const batch = await (await createBatch(financeVn)).json();
  await lockBatch(financeVn, batch.id);

  const after = await (await fetch(`${baseUrl}/me/country/vn/earnings`, { headers: bearer(token) })).json();
  assert.equal(after.summary.pendingNetMinor, 0);
  assert.equal(after.summary.availableNetMinor, 450000);
  assert.equal(after.ledger.balanceMinor, 450000); // sổ cái không đổi (không phải chuyển tiền)
});
