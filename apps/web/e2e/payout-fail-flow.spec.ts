import { test, expect } from "@playwright/test";

// N15: creator rút tiền (V08) → Finance bấm "Thất bại (hoàn)" ở V12 → provider mock FAIL →
// tiền HOÀN về số dư (đúng 1 lần) → creator thấy "Lỗi → đã hoàn" và rút lại được.
// Chạy trên PH để cách ly khỏi payout-flow.spec (spec đó settle mọi lệnh PROCESSING của VN).
test("V12 payout FAIL (PH): Finance marks fail -> money released, creator sees refund", async ({ page }) => {
  await page.goto("/mockup/creator/login");

  const ctx = await page.evaluate(async () => {
    const API = "http://localhost:3101";
    const j = (r: Response) => r.json();
    const login = (email: string, displayName?: string) =>
      fetch(`${API}/auth/mock-login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      }).then(j);

    const admin = await login("admin.ph@demo.affiliate.gl");
    const camp = await fetch(`${API}/markets/ph/campaigns`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ title: `e2e-fail-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#p", brief: "", rewardMinor: 100000, slotsTotal: 3 }),
    }).then(j);

    const ops = await login("ops.ph@demo.affiliate.gl");
    const finance = await login("finance.ph@demo.affiliate.gl");
    const name = `FailFlow-${Date.now()}`; // duy nhất để tìm đúng dòng ở V12
    const creator = await login(`e2e-fail-${Date.now()}@example.com`, name);
    const ch = { "content-type": "application/json", authorization: `Bearer ${creator.token}` };
    await fetch(`${API}/me/country/ph/kyc`, { method: "POST", headers: ch, body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }) });
    const kyc = await fetch(`${API}/me/country/ph/kyc`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/ph/kyc/${kyc.caseId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
    });
    await fetch(`${API}/markets/ph/campaigns/${camp.id}/join`, { method: "POST", headers: { authorization: `Bearer ${creator.token}` } });
    await fetch(`${API}/me/country/ph/campaigns/${camp.id}/content`, { method: "POST", headers: ch, body: JSON.stringify({ url: "https://www.tiktok.com/@p/video/1", caption: "x #p" }) });
    const mine = await fetch(`${API}/me/country/ph/campaigns/${camp.id}/content`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/ph/content/${mine.submissions[0].id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decision: "APPROVE" }),
    });
    const batch = await fetch(`${API}/ops/ph/reconciliation`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${finance.token}` }, body: JSON.stringify({}) }).then(j);
    await fetch(`${API}/ops/ph/reconciliation/${batch.id}/lock`, { method: "POST", headers: { authorization: `Bearer ${finance.token}` } });

    window.localStorage.setItem("ag_session", JSON.stringify({ token: creator.token, user: creator.user }));
    return { name, creator: { token: creator.token, user: creator.user }, finance: { token: finance.token, user: finance.user } };
  });

  // Creator rút tiền qua UI (chọn thị trường PH) -> PROCESSING.
  await page.goto("/mockup/creator/wallet");
  await page.getByRole("button", { name: "🇵🇭 PH" }).click();
  await page.getByRole("button", { name: "VI" }).click(); // chọn PH giờ tự đổi UI sang EN → ép lại VI cho assertion tiếng Việt
  await expect(page.getByText("Rút được (PHP)")).toBeVisible();
  await page.getByRole("button", { name: "Yêu cầu rút tiền" }).click();
  const otpText = await page.getByText(/OTP \(mock/).innerText();
  const code = otpText.match(/\b(\d{6})\b/)![1];
  await page.getByPlaceholder("6 chữ số").fill(code);
  await page.getByRole("button", { name: /Xác nhận rút/ }).click();
  await expect(page.getByText("Đang xử lý (đã giữ chỗ)")).toBeVisible();

  // Đổi phiên sang Finance PH rồi bấm "Thất bại (hoàn)" đúng dòng của creator này ở V12.
  await page.evaluate((finance) => window.localStorage.setItem("ag_session", JSON.stringify(finance)), ctx.finance);
  await page.goto("/mockup/finance/workbench");
  await page.getByRole("button", { name: "🇵🇭 PH" }).click();
  await page.getByRole("button", { name: "VI" }).click(); // chọn PH giờ tự đổi UI sang EN → ép lại VI cho assertion tiếng Việt
  const row = page.locator(`tr[data-creator="${ctx.name}"]`);
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Thất bại (hoàn)" }).click();
  await expect(page.locator(`tr[data-creator="${ctx.name}"]`)).toHaveCount(0); // rời hàng đợi

  // Creator xem lại: thấy "Lỗi → đã hoàn" và số dư phục hồi (rút lại được).
  await page.evaluate((creator) => window.localStorage.setItem("ag_session", JSON.stringify(creator)), ctx.creator);
  await page.goto("/mockup/creator/wallet");
  await page.getByRole("button", { name: "🇵🇭 PH" }).click();
  await page.getByRole("button", { name: "VI" }).click(); // chọn PH giờ tự đổi UI sang EN → ép lại VI cho assertion tiếng Việt
  await expect(page.getByText("Lỗi → đã hoàn").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Yêu cầu rút tiền" })).toBeEnabled();
});
