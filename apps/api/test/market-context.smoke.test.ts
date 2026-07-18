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

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await app.close();
});

test("GET /health returns ok with db up", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { status: "ok", db: "up" });
});

test("GET /markets/vn/context returns VN/VND/vi-VN from the database", async () => {
  const res = await fetch(`${baseUrl}/markets/vn/context`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.market, "VN");
  assert.equal(body.currency, "VND");
  assert.equal(body.locale, "vi-VN");
  assert.equal(body.enabled, true);
});

test("GET /markets/ph/context returns PH/PHP/fil-PH from the database", async () => {
  const res = await fetch(`${baseUrl}/markets/ph/context`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.market, "PH");
  assert.equal(body.currency, "PHP");
  assert.equal(body.locale, "fil-PH");
});

test("GET /markets/xx/context returns a controlled 404 envelope, not a fake market", async () => {
  const res = await fetch(`${baseUrl}/markets/xx/context`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error.code, "RESOURCE_NOT_FOUND");
});
