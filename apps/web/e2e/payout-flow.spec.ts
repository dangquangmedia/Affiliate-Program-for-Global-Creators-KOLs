import { test, expect } from "@playwright/test";

// N14: creator có số dư AVAILABLE rút tiền qua V08 (OTP + reserve → PROCESSING); Finance settle
// SUCCESS (qua API — UI Finance đã có test khác) → creator thấy PAID.
test("V08 payout: creator withdraws with OTP, Finance settles -> PAID", async ({ page }) => {
  await page.goto("/mockup/creator/login");

  const financeToken = await page.evaluate(async () => {
    const API = "http://localhost:3001";
    const j = (r: Response) => r.json();
    const login = (email: string) =>
      fetch(`${API}/auth/mock-login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      }).then(j);

    const admin = await login("admin.vn@demo.affiliate.gl");
    const camp = await fetch(`${API}/markets/vn/campaigns`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ title: `e2e-pay-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#p", brief: "", rewardMinor: 500000, slotsTotal: 3 }),
    }).then(j);

    const ops = await login("ops.vn@demo.affiliate.gl");
    const finance = await login("finance.vn@demo.affiliate.gl");
    const creator = await login(`e2e-pay-${Date.now()}@example.com`);
    const ch = { "content-type": "application/json", authorization: `Bearer ${creator.token}` };
    await fetch(`${API}/me/country/vn/kyc`, { method: "POST", headers: ch, body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }) });
    const kyc = await fetch(`${API}/me/country/vn/kyc`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/vn/kyc/${kyc.caseId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
    });
    await fetch(`${API}/markets/vn/campaigns/${camp.id}/join`, { method: "POST", headers: { authorization: `Bearer ${creator.token}` } });
    await fetch(`${API}/me/country/vn/campaigns/${camp.id}/content`, { method: "POST", headers: ch, body: JSON.stringify({ url: "https://www.tiktok.com/@p/video/1", caption: "x #p" }) });
    const mine = await fetch(`${API}/me/country/vn/campaigns/${camp.id}/content`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/vn/content/${mine.submissions[0].id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decision: "APPROVE" }),
    });
    // Finance đối soát + khoá -> AVAILABLE.
    const batch = await fetch(`${API}/ops/vn/reconciliation`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${finance.token}` }, body: JSON.stringify({}) }).then(j);
    await fetch(`${API}/ops/vn/reconciliation/${batch.id}/lock`, { method: "POST", headers: { authorization: `Bearer ${finance.token}` } });

    window.localStorage.setItem("ag_session", JSON.stringify({ token: creator.token, user: creator.user }));
    return finance.token as string;
  });

  // Creator rút tiền qua UI.
  await page.goto("/mockup/creator/wallet");
  await expect(page.getByText("Rút được (VND)")).toBeVisible();
  await page.getByRole("button", { name: "Yêu cầu rút tiền" }).click();
  const otpText = await page.getByText(/OTP \(mock/).innerText();
  const code = otpText.match(/\b(\d{6})\b/)![1];
  await page.getByPlaceholder("6 chữ số").fill(code);
  await page.getByRole("button", { name: /Xác nhận rút/ }).click();
  await expect(page.getByText("Đang xử lý (đã giữ chỗ)")).toBeVisible();

  // Finance settle SUCCESS (qua API) -> creator reload thấy PAID.
  await page.evaluate(async (financeToken) => {
    const API = "http://localhost:3001";
    const q = await fetch(`${API}/ops/vn/payouts`, { headers: { authorization: `Bearer ${financeToken}` } }).then((r) => r.json());
    // Settle mọi lệnh PROCESSING (hàng đợi toàn nước) để chắc chắn lệnh của test này được xử lý.
    for (const p of q as Array<{ id: string }>) {
      await fetch(`${API}/ops/vn/payouts/${p.id}/settle`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${financeToken}` },
        body: JSON.stringify({ result: "SUCCESS" }),
      });
    }
  }, financeToken);

  await page.reload();
  await expect(page.getByText("Đã trả").first()).toBeVisible();
});
