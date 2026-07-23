// Smoke test luồng tiền end-to-end qua HTTP thuần, chạy được với BẤT KỲ base URL nào:
// container local, Cloud Run staging, hay API dev đang mở. Đây là "smoke/E2E trên staging" mà
// Tuần 7 yêu cầu — không phụ thuộc mã nguồn Go, chỉ dùng đúng HTTP contract mà frontend dùng.
//
//   node scripts/smoke.mjs                      # mặc định http://127.0.0.1:8080
//   node scripts/smoke.mjs https://api.example  # staging
//   SMOKE_MARKET=ph node scripts/smoke.mjs      # đổi thị trường
//
// Thoát 0 = mọi bước xanh. Thoát 1 = in rõ bước hỏng, status và body.

const baseUrl = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const market = (process.env.SMOKE_MARKET ?? "vn").toLowerCase();
const stamp = Date.now();
const steps = [];

class SmokeError extends Error {}

function pass(name, detail) {
  steps.push({ name, detail });
  console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`);
}

async function call(method, path, { token, body, expect } = {}) {
  const headers = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new SmokeError(`${method} ${path} không kết nối được: ${error.message}`);
  }
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (expect !== undefined && response.status !== expect) {
    throw new SmokeError(
      `${method} ${path} trả ${response.status}, mong đợi ${expect}. Body: ${text.slice(0, 400)}`,
    );
  }
  return { status: response.status, payload };
}

async function login(email) {
  const { payload } = await call("POST", "/auth/mock-login", {
    body: { email, displayName: email.split("@")[0] },
    expect: 201,
  });
  if (!payload?.token) throw new SmokeError(`mock-login ${email} không trả token`);
  return payload.token;
}

function requireTrue(condition, message) {
  if (!condition) throw new SmokeError(message);
}

async function main() {
  console.log(`\nSmoke money-spine → ${baseUrl} (market=${market})\n`);

  // --- Nền tảng ---
  const health = await call("GET", "/health", { expect: 200 });
  requireTrue(health.payload?.status === "ok" && health.payload?.db === "up", `/health bất thường: ${JSON.stringify(health.payload)}`);
  pass("health", "status=ok db=up");

  await call("GET", "/", { expect: 200 });
  pass("service catalog");

  const context = await call("GET", `/markets/${market}/context`, { expect: 200 });
  const currency = context.payload?.currency;
  requireTrue(Boolean(currency), "market context thiếu currency");
  pass("market context", `currency=${currency}`);

  // --- Đăng nhập 5 vai ---
  const creatorEmail = `smoke-${market}-${stamp}@example.com`;
  const creator = await login(creatorEmail);
  const ops = await login(`ops.${market}@demo.affiliate.gl`);
  const admin = await login(`admin.${market}@demo.affiliate.gl`);
  const finance = await login(`finance.${market}@demo.affiliate.gl`);
  const globalAdmin = await login("global.admin@demo.affiliate.gl");
  pass("mock-login 5 vai");

  const me = await call("GET", "/auth/me", { token: creator, expect: 200 });
  requireTrue(me.payload?.user?.email === creatorEmail, "auth/me trả sai user");
  pass("session Bearer hợp lệ");

  // --- Cách ly: không token = 401 ---
  await call("GET", "/auth/me", { expect: 401 });
  pass("thiếu session → 401");

  // --- Country profile + KYC ---
  await call("POST", `/me/country/${market}`, { token: creator, expect: 201 });
  pass("tạo country profile");

  const kyc = await call("POST", `/me/country/${market}/kyc`, {
    token: creator,
    expect: 201,
    body: {
      values: { fullName: "Smoke Test", idNumber: "SMOKE-ID", bankAccount: "SMOKE-BANK", taxId: "SMOKE-TAX" },
    },
  });
  const caseId = kyc.payload?.caseId;
  requireTrue(Boolean(caseId), "KYC submit không trả caseId");
  pass("KYC submit", `case=${caseId}`);

  // Creator không được đụng hàng đợi Ops.
  await call("GET", `/ops/${market}/kyc/queue`, { token: creator, expect: 403 });
  pass("creator vào queue Ops → 403");

  const decisions = (kyc.payload.fields ?? []).map((field) => ({ key: field.key, decision: "ACCEPT" }));
  requireTrue(decisions.length > 0, "KYC case không có field nào");
  const reviewed = await call("POST", `/ops/${market}/kyc/${caseId}/review`, {
    token: ops,
    expect: 201,
    body: { decisions },
  });
  requireTrue(reviewed.payload?.state === "APPROVED", `KYC sau duyệt = ${reviewed.payload?.state}, mong đợi APPROVED`);
  pass("Ops duyệt KYC", "state=APPROVED");

  // --- Campaign + join ---
  const rewardMinor = market === "vn" ? 1000000 : 100000;
  const campaign = await call("POST", `/markets/${market}/campaigns`, {
    token: admin,
    expect: 201,
    body: {
      title: `Smoke ${market.toUpperCase()} ${stamp}`,
      brand: "SmokeBrand",
      platform: "TikTok",
      requiredHashtag: "#Smoke",
      brief: "week7 staging smoke",
      rewardMinor,
      slotsTotal: 5,
    },
  });
  const campaignId = campaign.payload?.id;
  requireTrue(Boolean(campaignId), "tạo campaign không trả id");
  pass("Admin tạo campaign", `reward=${rewardMinor} ${currency}`);

  const joined = await call("POST", `/markets/${market}/campaigns/${campaignId}/join`, { token: creator, expect: 201 });
  requireTrue(joined.payload?.state === "JOINED", `join state = ${joined.payload?.state}`);
  pass("Creator join", "state=JOINED");

  // Join lại phải idempotent, không tạo suất thứ hai.
  const rejoined = await call("POST", `/markets/${market}/campaigns/${campaignId}/join`, { token: creator });
  requireTrue(
    [200, 201, 409].includes(rejoined.status),
    `join lần hai trả ${rejoined.status}, mong đợi 200/201/409 chứ không phải lỗi khác`,
  );
  pass("join lặp lại không nhân đôi suất", `status=${rejoined.status}`);

  // --- Content → earning ---
  const submitted = await call("POST", `/me/country/${market}/campaigns/${campaignId}/content`, {
    token: creator,
    expect: 201,
    body: { url: `https://www.tiktok.com/@smoke/video/${stamp}`, caption: "#Smoke" },
  });
  const submissionId = submitted.payload?.submissions?.[0]?.id;
  requireTrue(Boolean(submissionId), "nộp content không trả submission id");
  pass("Creator nộp content", `submission=${submissionId}`);

  await call("POST", `/ops/${market}/content/${submissionId}/review`, {
    token: ops,
    expect: 201,
    body: { decision: "APPROVE" },
  });
  pass("Ops duyệt content");

  const earnings = await call("GET", `/me/country/${market}/earnings`, { token: creator, expect: 200 });
  const earning = earnings.payload?.earnings?.[0];
  requireTrue(Boolean(earning), "dashboard không có earning nào sau khi duyệt");
  requireTrue(earning.grossMinor === rewardMinor, `gross=${earning.grossMinor}, mong đợi ${rewardMinor}`);
  requireTrue(earning.netMinor === earning.grossMinor - earning.taxMinor, "net != gross - tax");
  requireTrue(Number.isInteger(earning.netMinor), "netMinor không phải số nguyên minor units");
  pass("Earning tạo đúng 1 lần", `gross=${earning.grossMinor} tax=${earning.taxMinor} net=${earning.netMinor}`);

  // --- Đối soát ---
  const batch = await call("POST", `/ops/${market}/reconciliation`, { token: finance, expect: 201, body: {} });
  const batchId = batch.payload?.id;
  requireTrue(Boolean(batchId), "tạo batch không trả id");
  pass("Finance tạo batch đối soát", `lines=${batch.payload?.lineCount}`);

  const locked = await call("POST", `/ops/${market}/reconciliation/${batchId}/lock`, { token: finance, expect: 201 });
  requireTrue(locked.payload?.status === "LOCKED", `batch sau lock = ${locked.payload?.status}`);
  pass("Khoá batch", "status=LOCKED");

  const relock = await call("POST", `/ops/${market}/reconciliation/${batchId}/lock`, { token: finance });
  requireTrue(relock.status === 409, `lock lần hai trả ${relock.status}, mong đợi 409`);
  pass("Lock idempotent", "lần hai → 409");

  // --- Ví + rút tiền ---
  const wallet = await call("GET", `/me/country/${market}/wallet`, { token: creator, expect: 200 });
  const withdrawable = wallet.payload?.withdrawableMinor ?? 0;
  requireTrue(withdrawable >= earning.netMinor, `ví khả dụng=${withdrawable}, mong đợi >= ${earning.netMinor}`);
  pass("Tiền vào ví sau khoá batch", `withdrawable=${withdrawable} ${wallet.payload?.currency}`);

  const otp = await call("POST", `/me/country/${market}/payouts/otp`, { token: creator, expect: 201 });
  requireTrue(Boolean(otp.payload?.otpId && otp.payload?.code), "OTP thiếu otpId/code");
  pass("Phát OTP (mock)");

  const payoutAmount = Math.max(wallet.payload?.minPayoutMinor ?? 0, earning.netMinor);
  const payout = await call("POST", `/me/country/${market}/payouts`, {
    token: creator,
    expect: 201,
    body: {
      amountMinor: payoutAmount,
      otpId: otp.payload.otpId,
      code: otp.payload.code,
      idempotencyKey: `smoke-${stamp}`,
    },
  });
  const payoutId = payout.payload?.id;
  requireTrue(Boolean(payoutId), "tạo payout không trả id");
  pass("Tạo lệnh rút (reserve)", `amount=${payoutAmount} state=${payout.payload?.state}`);

  const settled = await call("POST", `/ops/${market}/payouts/${payoutId}/settle`, {
    token: finance,
    expect: 201,
    body: { result: "SUCCESS" },
  });
  requireTrue(settled.payload?.state === "PAID", `settle xong state=${settled.payload?.state}, mong đợi PAID`);
  pass("Finance settle SUCCESS", "state=PAID");

  const resettle = await call("POST", `/ops/${market}/payouts/${payoutId}/settle`, {
    token: finance,
    body: { result: "SUCCESS" },
  });
  requireTrue(resettle.status === 409, `settle lần hai trả ${resettle.status}, mong đợi 409`);
  pass("Không double-pay", "settle lần hai → 409");

  // --- Audit ---
  const audit = await call("GET", `/admin/audit?market=${market}`, { token: globalAdmin, expect: 200 });
  requireTrue(Array.isArray(audit.payload) && audit.payload.length > 0, "audit rỗng sau cả chuỗi staff action");
  pass("Audit ghi nhận", `${audit.payload.length} sự kiện`);

  await call("GET", `/admin/audit?market=${market}`, { token: finance, expect: 403 });
  pass("Sai vai xem audit → 403");

  console.log(`\nSMOKE PASS — ${steps.length} bước xanh trên ${baseUrl}\n`);
}

main().catch((error) => {
  console.error(`\nSMOKE FAIL sau ${steps.length} bước xanh:\n  ${error.message}\n`);
  process.exit(1);
});
