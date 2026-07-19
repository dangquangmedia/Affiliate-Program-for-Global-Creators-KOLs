import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import "../src/load-env";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/http-exception.filter";
import { JoinService } from "../src/campaign/join.service";
import { PrismaService } from "../src/prisma.service";

let app: INestApplication;
let baseUrl: string;
let adminVn: string;
let opsVn: string;
let opsPh: string;

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

async function createCampaign(title: string): Promise<string> {
  const r = await fetch(`${baseUrl}/markets/vn/campaigns`, {
    method: "POST",
    headers: jsonH(adminVn),
    body: JSON.stringify({ title, brand: "B", platform: "TikTok", requiredHashtag: "#x2026", brief: "", rewardMinor: 100000, slotsTotal: 5 }),
  });
  return (await r.json()).id;
}

// Creator đã join sẵn 1 campaign mới -> trả (token, campaignId).
async function joinedCreator(tag: string): Promise<{ token: string; cid: string }> {
  const token = await approvedCreator(`n11-${tag}-${Date.now()}@example.com`);
  const cid = await createCampaign(`n11-${tag}-${Date.now()}`);
  await fetch(`${baseUrl}/markets/vn/campaigns/${cid}/join`, { method: "POST", headers: bearer(token) });
  return { token, cid };
}

const submitContent = (token: string, cid: string, url: string, caption = "review #x2026") =>
  fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, {
    method: "POST",
    headers: jsonH(token),
    body: JSON.stringify({ url, caption }),
  });

const review = (token: string, sid: string, decision: string, reason?: string) =>
  fetch(`${baseUrl}/ops/vn/content/${sid}/review`, {
    method: "POST",
    headers: jsonH(token),
    body: JSON.stringify({ decision, reason }),
  });

async function latestSubmissionId(token: string, cid: string): Promise<string> {
  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { headers: bearer(token) })).json();
  return mine.submissions[0].id;
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  adminVn = await login("admin.vn@demo.affiliate.gl");
  opsVn = await login("ops.vn@demo.affiliate.gl");
  opsPh = await login("ops.ph@demo.affiliate.gl");
});

after(async () => {
  await app.close();
});

test("submit without joining -> 404", async () => {
  const token = await approvedCreator(`n11-nojoin-${Date.now()}@example.com`);
  const cid = await createCampaign(`nojoin-${Date.now()}`);
  const res = await submitContent(token, cid, "https://www.tiktok.com/@a/video/1");
  assert.equal(res.status, 404);
});

test("submit -> participation CONTENT_SUBMITTED, attempt 1, flags recorded", async () => {
  const { token, cid } = await joinedCreator("submit");
  const res = await submitContent(token, cid, "https://www.tiktok.com/@a/video/1", "video demo #x2026");
  assert.equal(res.status, 201);
  const mine = await res.json();
  assert.equal(mine.participationState, "CONTENT_SUBMITTED");
  assert.equal(mine.submissions.length, 1);
  assert.equal(mine.submissions[0].attemptNo, 1);
  assert.equal(mine.submissions[0].hashtagOk, true);
  assert.equal(mine.submissions[0].platformOk, true);
});

test("wrong-platform URL is blocked early (400)", async () => {
  const { token, cid } = await joinedCreator("wrongp");
  const res = await submitContent(token, cid, "https://www.facebook.com/photo/123");
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "VALIDATION_ERROR");
});

test("missing hashtag in caption -> advisory flag only (still submits)", async () => {
  const { token, cid } = await joinedCreator("notag");
  const res = await submitContent(token, cid, "https://www.tiktok.com/@a/video/2", "no tag here");
  assert.equal(res.status, 201);
  const mine = await res.json();
  assert.equal(mine.submissions[0].hashtagOk, false); // cờ "Cần xem" cho Ops, không chặn
});

test("submit while pending -> 409 SUBMISSION_PENDING", async () => {
  const { token, cid } = await joinedCreator("pending");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/3");
  const res = await submitContent(token, cid, "https://www.tiktok.com/@a/video/4");
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "SUBMISSION_PENDING");
});

test("Ops VN sees submission in queue; Ops PH does NOT (isolation); creator -> 403", async () => {
  const { token, cid } = await joinedCreator("queue");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/5");
  const sid = await latestSubmissionId(token, cid);

  const qVn = await (await fetch(`${baseUrl}/ops/vn/content/queue`, { headers: bearer(opsVn) })).json();
  assert.ok(qVn.some((s: { submissionId: string }) => s.submissionId === sid), "Ops VN phải thấy");

  const qPh = await (await fetch(`${baseUrl}/ops/ph/content/queue`, { headers: bearer(opsPh) })).json();
  assert.ok(!qPh.some((s: { submissionId: string }) => s.submissionId === sid), "Ops PH không được thấy");

  const forbidden = await fetch(`${baseUrl}/ops/vn/content/queue`, { headers: bearer(token) });
  assert.equal(forbidden.status, 403);

  // Cách ly review: Ops PH mở submission VN qua route nước MÌNH -> 404 (không lộ tồn tại).
  const cross = await fetch(`${baseUrl}/ops/ph/content/${sid}/review`, {
    method: "POST",
    headers: jsonH(opsPh),
    body: JSON.stringify({ decision: "APPROVE" }),
  });
  assert.equal(cross.status, 404);
});

test("approve -> earning exactly-once with snapshot gross + VN tax 10%", async () => {
  const { token, cid } = await joinedCreator("approve");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/6");
  const sid = await latestSubmissionId(token, cid);

  const res = await review(opsVn, sid, "APPROVE");
  assert.equal(res.status, 201);
  assert.equal((await res.json()).state, "APPROVED");

  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { headers: bearer(token) })).json();
  assert.equal(mine.participationState, "APPROVED");

  const prisma = app.get(PrismaService);
  const count = await prisma.db.earning.count({ where: { submissionId: sid } });
  assert.equal(count, 1);
  const earning = (await prisma.db.earning.findFirst({ where: { submissionId: sid } })) as {
    grossMinor: bigint; taxMinor: bigint; status: string; currency: string;
  };
  assert.equal(earning.grossMinor, 100000n); // snapshot đơn giá lúc join
  assert.equal(earning.taxMinor, 10000n); // VN tax 10% (seed country_config)
  assert.equal(earning.status, "PENDING");
  assert.equal(earning.currency, "VND");
});

test("second approve -> 409 ALREADY_REVIEWED, still exactly 1 earning", async () => {
  const { token, cid } = await joinedCreator("double");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/7");
  const sid = await latestSubmissionId(token, cid);

  await review(opsVn, sid, "APPROVE");
  const again = await review(opsVn, sid, "APPROVE");
  assert.equal(again.status, 409);
  assert.equal((await again.json()).error.code, "ALREADY_REVIEWED");

  const count = await app.get(PrismaService).db.earning.count({ where: { submissionId: sid } });
  assert.equal(count, 1);
});

test("RACE: double-click approve (2 concurrent) -> exactly 1 wins, 1 earning", async () => {
  const { token, cid } = await joinedCreator("race");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/8");
  const sid = await latestSubmissionId(token, cid);

  const [r1, r2] = await Promise.all([review(opsVn, sid, "APPROVE"), review(opsVn, sid, "APPROVE")]);
  const statuses = [r1.status, r2.status].sort();
  assert.deepEqual(statuses, [201, 409], `một thắng một 409, got ${statuses}`);

  const count = await app.get(PrismaService).db.earning.count({ where: { submissionId: sid } });
  assert.equal(count, 1, "đúng 1 earning dù duyệt song song");
});

test("reject requires reason (400); reject sets REJECTED + fix deadline (QĐ-4)", async () => {
  const { token, cid } = await joinedCreator("reject");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/9");
  const sid = await latestSubmissionId(token, cid);

  const noReason = await review(opsVn, sid, "REJECT");
  assert.equal(noReason.status, 400);

  const res = await review(opsVn, sid, "REJECT", "Thiếu hashtag trong video");
  assert.equal(res.status, 201);

  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { headers: bearer(token) })).json();
  assert.equal(mine.participationState, "REJECTED");
  assert.ok(mine.fixDeadlineAt, "phải có hạn sửa 24h");
  assert.equal(mine.submissions[0].rejectReason, "Thiếu hashtag trong video");
});

test("resubmit after reject -> attempt 2 chains to attempt 1; approve creates exactly 1 earning total", async () => {
  const { token, cid } = await joinedCreator("resubmit");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/10");
  const sid1 = await latestSubmissionId(token, cid);
  await review(opsVn, sid1, "REJECT", "Sai hashtag");

  const res = await submitContent(token, cid, "https://www.tiktok.com/@a/video/11", "fixed #x2026");
  assert.equal(res.status, 201);
  const mine = await res.json();
  assert.equal(mine.participationState, "CONTENT_SUBMITTED");
  assert.equal(mine.submissions[0].attemptNo, 2);

  const sid2 = mine.submissions[0].id;
  await review(opsVn, sid2, "APPROVE");
  const prisma = app.get(PrismaService);
  const p = (await prisma.db.submission.findFirst({ where: { id: sid2 } })) as { supersedesId: string | null };
  assert.equal(p.supersedesId, sid1, "attempt 2 trỏ về bản bị từ chối");
  // Chỉ bản được duyệt sinh tiền — attempt 1 (rejected) không có earning.
  assert.equal(await prisma.db.earning.count({ where: { submissionId: sid1 } }), 0);
  assert.equal(await prisma.db.earning.count({ where: { submissionId: sid2 } }), 1);
});

test("REJECTED past fix deadline is reclaimed by worker (QĐ-4 nối N11)", async () => {
  const { token, cid } = await joinedCreator("fixreclaim");
  await submitContent(token, cid, "https://www.tiktok.com/@a/video/12");
  const sid = await latestSubmissionId(token, cid);
  await review(opsVn, sid, "REJECT", "Cần sửa");

  // Đẩy hạn sửa về quá khứ -> worker phải thu hồi suất (EXPIRED + strike).
  const prisma = app.get(PrismaService);
  await prisma.db.$queryRaw`
    UPDATE participation SET fix_deadline_at = now() - interval '1 hour'
    WHERE campaign_id = ${cid}::uuid AND state = 'REJECTED' RETURNING id
  `;
  const res = await app.get(JoinService).reclaimExpired();
  assert.ok(res.reclaimed >= 1);

  const mine = await (await fetch(`${baseUrl}/me/country/vn/campaigns/${cid}/content`, { headers: bearer(token) })).json();
  assert.equal(mine.participationState, "EXPIRED");
});
