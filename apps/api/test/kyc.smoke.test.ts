import { test, before } from "node:test";
import assert from "node:assert/strict";
import { goApiBaseUrl } from "./go-api-harness";

let baseUrl: string;
let creatorToken: string;
let opsVnToken: string;
let opsPhToken: string;

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

  creatorToken = await login(`n8-creator-${Date.now()}@example.com`);
  opsVnToken = await login("ops.vn@demo.affiliate.gl"); // seed: LOCAL_OPS VN
  opsPhToken = await login("ops.ph@demo.affiliate.gl"); // seed: LOCAL_OPS PH
});

let caseId: string;

test("creator gets an empty VN KYC draft with the 4 checklist fields", async () => {
  const res = await fetch(`${baseUrl}/me/country/vn/kyc`, { headers: bearer(creatorToken) });
  assert.equal(res.status, 200);
  const body = await res.json();
  caseId = body.caseId;
  assert.equal(body.state, "DRAFT");
  assert.deepEqual(
    body.fields.map((f: { key: string }) => f.key).sort(),
    ["bankAccount", "fullName", "idNumber", "taxId"],
  );
});

test("creator submits KYC -> case becomes SUBMITTED, fields FILLED", async () => {
  const res = await fetch(`${baseUrl}/me/country/vn/kyc`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(creatorToken) },
    body: JSON.stringify({
      values: { fullName: "Nguyen Minh Anh", idNumber: "0790123", bankAccount: "1900bad", taxId: "8123" },
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.state, "SUBMITTED");
  assert.ok(body.fields.every((f: { state: string }) => f.state === "FILLED"));
});

test("Ops VN sees the case in queue; Ops PH does NOT (country isolation)", async () => {
  const vn = await (await fetch(`${baseUrl}/ops/vn/kyc/queue`, { headers: bearer(opsVnToken) })).json();
  assert.ok(vn.some((c: { caseId: string }) => c.caseId === caseId));

  const ph = await (await fetch(`${baseUrl}/ops/ph/kyc/queue`, { headers: bearer(opsPhToken) })).json();
  assert.ok(!ph.some((c: { caseId: string }) => c.caseId === caseId));
});

test("a creator (no staff role) is forbidden from the Ops queue", async () => {
  const res = await fetch(`${baseUrl}/ops/vn/kyc/queue`, { headers: bearer(creatorToken) });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, "FORBIDDEN");
});

test("Ops PH cannot review a VN case (404, not found in that country)", async () => {
  const res = await fetch(`${baseUrl}/ops/ph/kyc/${caseId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(opsPhToken) },
    body: JSON.stringify({ decisions: [{ key: "fullName", decision: "ACCEPT" }] }),
  });
  assert.equal(res.status, 404);
});

test("Ops VN rejects one field -> case REJECTED, only that field reopens", async () => {
  const res = await fetch(`${baseUrl}/ops/vn/kyc/${caseId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(opsVnToken) },
    body: JSON.stringify({
      decisions: [
        { key: "fullName", decision: "ACCEPT" },
        { key: "idNumber", decision: "ACCEPT" },
        { key: "taxId", decision: "ACCEPT" },
        { key: "bankAccount", decision: "NEEDS_CHANGES", reason: "Tên chủ TK không khớp giấy tờ." },
      ],
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.state, "REJECTED");
  const bank = body.fields.find((f: { key: string }) => f.key === "bankAccount");
  assert.equal(bank.state, "NEEDS_CHANGES");
  assert.equal(bank.reason, "Tên chủ TK không khớp giấy tờ.");
});

test("reject requires a reason (400 when missing)", async () => {
  const res = await fetch(`${baseUrl}/ops/vn/kyc/${caseId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(opsVnToken) },
    body: JSON.stringify({ decisions: [{ key: "bankAccount", decision: "NEEDS_CHANGES" }] }),
  });
  assert.equal(res.status, 400);
});

test("creator resubmits only the rejected field; accepted fields stay locked", async () => {
  const res = await fetch(`${baseUrl}/me/country/vn/kyc`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(creatorToken) },
    body: JSON.stringify({ values: { bankAccount: "1900good", fullName: "HACK ATTEMPT" } }),
  });
  const body = await res.json();
  assert.equal(body.state, "RESUBMITTED");
  const bank = body.fields.find((f: { key: string }) => f.key === "bankAccount");
  const name = body.fields.find((f: { key: string }) => f.key === "fullName");
  assert.equal(bank.value, "1900good"); // trường bị từ chối cập nhật được
  assert.equal(bank.state, "FILLED");
  assert.equal(name.state, "ACCEPTED"); // trường đã duyệt bị khoá, không bị ghi đè
  assert.notEqual(name.value, "HACK ATTEMPT");
});

test("Ops VN approves the resubmitted field -> case APPROVED", async () => {
  const res = await fetch(`${baseUrl}/ops/vn/kyc/${caseId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(opsVnToken) },
    body: JSON.stringify({ decisions: [{ key: "bankAccount", decision: "ACCEPT" }] }),
  });
  const body = await res.json();
  assert.equal(body.state, "APPROVED");
  assert.ok(body.fields.every((f: { state: string }) => f.state === "ACCEPTED"));
});
