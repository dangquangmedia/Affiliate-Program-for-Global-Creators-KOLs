import { test, before } from "node:test";
import assert from "node:assert/strict";
import { goApiBaseUrl } from "./go-api-harness";

let baseUrl: string;

before(async () => {
  baseUrl = await goApiBaseUrl();
});

// Email ngẫu nhiên mỗi lần chạy để test idempotent với DB đã seed/nhiều lần chạy.
const email = `n6-${Date.now()}@example.com`;

test("POST /auth/mock-login issues a session token for a new user", async () => {
  const res = await fetch(`${baseUrl}/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email.toUpperCase(), displayName: "N6 Tester" }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(typeof body.token === "string" && body.token.length >= 32);
  assert.equal(body.user.email, email.toLowerCase()); // email được chuẩn hoá về lowercase
  assert.equal(body.user.displayName, "N6 Tester");
});

test("GET /auth/me resolves the session server-side", async () => {
  const login = await (
    await fetch(`${baseUrl}/auth/mock-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    })
  ).json();

  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { authorization: `Bearer ${login.token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.user.email, email.toLowerCase());
  assert.ok(Array.isArray(body.roles)); // creator mới chưa có vai staff -> mảng rỗng
});

test("GET /auth/me without a token is a controlled 401", async () => {
  const res = await fetch(`${baseUrl}/auth/me`);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("POST /auth/logout revokes the session so the token stops working", async () => {
  const login = await (
    await fetch(`${baseUrl}/auth/mock-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    })
  ).json();
  const auth = { authorization: `Bearer ${login.token}` };

  const before = await fetch(`${baseUrl}/auth/me`, { headers: auth });
  assert.equal(before.status, 200);

  const out = await fetch(`${baseUrl}/auth/logout`, { method: "POST", headers: auth });
  assert.equal(out.status, 201);

  const after = await fetch(`${baseUrl}/auth/me`, { headers: auth });
  assert.equal(after.status, 401); // token cũ không còn dùng được
});

test("POST /auth/mock-login rejects an invalid email", async () => {
  const res = await fetch(`${baseUrl}/auth/mock-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
});
