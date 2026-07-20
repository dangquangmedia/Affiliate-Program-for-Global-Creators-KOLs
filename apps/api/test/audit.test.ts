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

// N17 — Audit trail AD-02. Mọi quyết định của staff (KYC/content/đối soát/payout/campaign) phải
// để lại vết append-only, ghi TRONG CÙNG transaction với hành động. Bộ test chứng minh:
// (1) mỗi hành động sinh đúng 1 vết audit với action/target đúng;
// (2) hành động bị rollback (409) KHÔNG để lại vết (audit atomic với quyết định);
// (3) chỉ GLOBAL_ADMIN đọc được nhật ký toàn cục; lọc theo nước hoạt động.

let app: INestApplication;
let baseUrl: string;
let opsVn: string;
let adminVn: string;
let financeVn: string;
let globalAdmin: string;

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

type AuditRow = { action: string; targetType: string | null; targetId: string | null; metadata: unknown; countryId: string | null };
const auditsFor = async (targetId: string): Promise<AuditRow[]> =>
  (await app.get(PrismaService).db.auditEvent.findMany({ where: { targetId } })) as AuditRow[];

interface SpineIds {
  creator: string;
  caseId: string;
  campaignId: string;
  submissionId: string;
  batchId: string;
  payoutId: string;
}

// Chạy trọn spine VN, trả về id từng bước để kiểm vết audit tại mỗi mốc.
async function runSpine(tag: string): Promise<SpineIds> {
  const creator = await login(`audit-${tag}-${Date.now()}@example.com`);

  // KYC → Ops duyệt (KYC_REVIEWED).
  await fetch(`${baseUrl}/me/country/vn/kyc`, {
    method: "POST",
    headers: jsonH(creator),
    body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }),
  });
  const kyc = await (await fetch(`${baseUrl}/me/country/vn/kyc`, { headers: bearer(creator) })).json();
  await fetch(`${baseUrl}/ops/vn/kyc/${kyc.caseId}/review`, {
    method: "POST",
    headers: jsonH(opsVn),
    body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
  });

  // Campaign (CAMPAIGN_CREATED) → join → content → approve (CONTENT_APPROVED).
  const campaignId = (await (
    await fetch(`${baseUrl}/markets/vn/campaigns`, {
      method: "POST",
      headers: jsonH(adminVn),
      body: JSON.stringify({ title: `audit-${tag}-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: 500000, slotsTotal: 3 }),
    })
  ).json()).id;
  await fetch(`${baseUrl}/markets/vn/campaigns/${campaignId}/join`, { method: "POST", headers: bearer(creator) });
  await fetch(`${baseUrl}/me/country/vn/campaigns/${campaignId}/content`, {
    method: "POST",
    headers: jsonH(creator),
    body: JSON.stringify({ url: "https://www.tiktok.com/@a/video/1", caption: "x #t" }),
  });
  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${campaignId}/content`, { headers: bearer(creator) })).json();
  const submissionId = mine.submissions[0].id;
  await fetch(`${baseUrl}/ops/vn/content/${submissionId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "APPROVE" }) });

  // Đối soát (RECON_BATCH_CREATED) → khoá (RECON_BATCH_LOCKED) → AVAILABLE.
  const batch = await (await fetch(`${baseUrl}/ops/vn/reconciliation`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({}) })).json();
  await fetch(`${baseUrl}/ops/vn/reconciliation/${batch.id}/lock`, { method: "POST", headers: bearer(financeVn) });

  // Rút (OTP + reserve) → settle (PAYOUT_SETTLED).
  const otp = await (await fetch(`${baseUrl}/me/country/vn/payouts/otp`, { method: "POST", headers: bearer(creator) })).json();
  const payout = await (
    await fetch(`${baseUrl}/me/country/vn/payouts`, {
      method: "POST",
      headers: jsonH(creator),
      body: JSON.stringify({ amountMinor: 450000, otpId: otp.otpId, code: otp.code, idempotencyKey: randomUUID() }),
    })
  ).json();

  return { creator, caseId: kyc.caseId, campaignId, submissionId, batchId: batch.id, payoutId: payout.id };
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  opsVn = await login("ops.vn@demo.affiliate.gl");
  adminVn = await login("admin.vn@demo.affiliate.gl");
  financeVn = await login("finance.vn@demo.affiliate.gl");
  globalAdmin = await login("global.admin@demo.affiliate.gl");
});

after(async () => {
  await app.close();
});

test("audit view requires a session (401)", async () => {
  assert.equal((await fetch(`${baseUrl}/admin/audit`)).status, 401);
});

test("only GLOBAL_ADMIN reads the audit log (Ops/Admin/Finance/creator -> 403)", async () => {
  const creator = await login(`audit-forbid-${Date.now()}@example.com`);
  for (const t of [opsVn, adminVn, financeVn, creator]) {
    assert.equal((await fetch(`${baseUrl}/admin/audit`, { headers: bearer(t) })).status, 403);
  }
  assert.equal((await fetch(`${baseUrl}/admin/audit`, { headers: bearer(globalAdmin) })).status, 200);
});

test("each staff decision writes exactly one append-only audit event with correct action", async () => {
  const ids = await runSpine("spine");

  // Settle payout để có cả PAYOUT_SETTLED.
  await fetch(`${baseUrl}/ops/vn/payouts/${ids.payoutId}/settle`, { method: "POST", headers: jsonH(financeVn), body: JSON.stringify({ result: "SUCCESS" }) });

  const kyc = await auditsFor(ids.caseId);
  assert.equal(kyc.length, 1);
  assert.equal(kyc[0].action, "KYC_REVIEWED");
  assert.equal(kyc[0].targetType, "kyc_case");
  assert.equal((kyc[0].metadata as { outcome: string }).outcome, "APPROVED");

  const camp = await auditsFor(ids.campaignId);
  assert.equal(camp.length, 1);
  assert.equal(camp[0].action, "CAMPAIGN_CREATED");

  const content = await auditsFor(ids.submissionId);
  assert.equal(content.length, 1);
  assert.equal(content[0].action, "CONTENT_APPROVED");

  const batch = await auditsFor(ids.batchId);
  assert.deepEqual(
    batch.map((b) => b.action).sort(),
    ["RECON_BATCH_CREATED", "RECON_BATCH_LOCKED"],
  );

  const payout = await auditsFor(ids.payoutId);
  assert.equal(payout.length, 1);
  assert.equal(payout[0].action, "PAYOUT_SETTLED");
  assert.equal((payout[0].metadata as { toState: string }).toState, "PAID");
});

test("rejected content records CONTENT_REJECTED with the reason in metadata", async () => {
  const creator = await login(`audit-reject-${Date.now()}@example.com`);
  await fetch(`${baseUrl}/me/country/vn/kyc`, { method: "POST", headers: jsonH(creator), body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }) });
  const kyc = await (await fetch(`${baseUrl}/me/country/vn/kyc`, { headers: bearer(creator) })).json();
  await fetch(`${baseUrl}/ops/vn/kyc/${kyc.caseId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }) });
  const cid = (await (await fetch(`${baseUrl}/markets/vn/campaigns`, { method: "POST", headers: jsonH(adminVn), body: JSON.stringify({ title: `audit-rej-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#t", brief: "", rewardMinor: 500000, slotsTotal: 3 }) })).json()).id;
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(creator) });
  await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { method: "POST", headers: jsonH(creator), body: JSON.stringify({ url: "https://www.tiktok.com/@a/video/1", caption: "x #t" }) });
  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { headers: bearer(creator) })).json();
  const subId = mine.submissions[0].id;

  await fetch(`${baseUrl}/ops/vn/content/${subId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "REJECT", reason: "Sai bố cục" }) });
  const audits = await auditsFor(subId);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, "CONTENT_REJECTED");
  assert.equal((audits[0].metadata as { reason: string }).reason, "Sai bố cục");
});

test("a rolled-back decision leaves NO audit (double-approve 409 -> still exactly one audit)", async () => {
  const ids = await runSpine("atomic");
  // Duyệt lần 2 cùng submission -> 409 ALREADY_REVIEWED (claim trượt) -> transaction rollback.
  const again = await fetch(`${baseUrl}/ops/vn/content/${ids.submissionId}/review`, { method: "POST", headers: jsonH(opsVn), body: JSON.stringify({ decision: "APPROVE" }) });
  assert.equal(again.status, 409);

  const audits = await auditsFor(ids.submissionId);
  assert.equal(audits.length, 1); // vết audit KHÔNG bị nhân đôi bởi lần gọi thất bại
});

test("GLOBAL_ADMIN can filter the audit log by market", async () => {
  const ids = await runSpine("filter");
  const vn = (await (await fetch(`${baseUrl}/admin/audit?market=vn`, { headers: bearer(globalAdmin) })).json()) as Array<{ targetId: string; countryCode: string }>;
  assert.ok(vn.some((e) => e.targetId === ids.submissionId));
  assert.ok(vn.every((e) => e.countryCode === "VN")); // lọc VN không lẫn PH

  const ph = (await (await fetch(`${baseUrl}/admin/audit?market=ph`, { headers: bearer(globalAdmin) })).json()) as Array<{ targetId: string }>;
  assert.ok(!ph.some((e) => e.targetId === ids.submissionId)); // sự kiện VN không xuất hiện khi lọc PH
});
