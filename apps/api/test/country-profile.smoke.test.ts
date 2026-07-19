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
let token: string;

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;

  const login = await (
    await fetch(`${baseUrl}/auth/mock-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `n7-${Date.now()}@example.com` }),
    })
  ).json();
  token = login.token;
});

after(async () => {
  await app.close();
});

const authHeader = (): Record<string, string> => ({ authorization: `Bearer ${token}` });

test("POST /me/country/vn creates a VN profile with country context from DB", async () => {
  const res = await fetch(`${baseUrl}/me/country/vn`, { method: "POST", headers: authHeader() });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.profileId);
  assert.equal(body.context.market, "VN");
  assert.equal(body.context.currency, "VND");
  assert.equal(body.context.locale, "vi-VN");
});

test("selecting the same country again is idempotent (no second profile)", async () => {
  const first = await (await fetch(`${baseUrl}/me/country/ph`, { method: "POST", headers: authHeader() })).json();
  const second = await (await fetch(`${baseUrl}/me/country/ph`, { method: "POST", headers: authHeader() })).json();
  assert.equal(first.profileId, second.profileId); // UNIQUE(user,country) -> cùng 1 hồ sơ
});

test("GET /me/countries lists only this session user's profiles", async () => {
  const res = await fetch(`${baseUrl}/me/countries`, { headers: authHeader() });
  assert.equal(res.status, 200);
  const body = await res.json();
  const markets = body.map((p: { context: { market: string } }) => p.context.market).sort();
  assert.deepEqual(markets, ["PH", "VN"]); // đúng 2 nước vừa tạo, không lẫn của user khác
});

test("country routes require a session (401 when unauthenticated)", async () => {
  const res = await fetch(`${baseUrl}/me/country/vn`, { method: "POST" });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, "UNAUTHENTICATED");
});

test("an unknown market is a controlled 404, not a fabricated profile", async () => {
  const res = await fetch(`${baseUrl}/me/country/xx`, { method: "POST", headers: authHeader() });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, "RESOURCE_NOT_FOUND");
});
