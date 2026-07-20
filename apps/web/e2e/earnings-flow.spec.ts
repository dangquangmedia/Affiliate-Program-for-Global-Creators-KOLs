import { test, expect } from "@playwright/test";

// N12: sau khi content được duyệt, V07 hiện thu nhập Gross–Thuế–Net + SỔ CÁI append-only.
test("V07 earnings: approved content shows Net + append-only ledger entries", async ({ page }) => {
  await page.goto("/mockup/creator/login");

  await page.evaluate(async () => {
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
      body: JSON.stringify({ title: `e2e-earn-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#e", brief: "", rewardMinor: 500000, slotsTotal: 3 }),
    }).then(j);

    const ops = await login("ops.vn@demo.affiliate.gl");
    const creator = await login(`e2e-earn-${Date.now()}@example.com`);
    const ch = { "content-type": "application/json", authorization: `Bearer ${creator.token}` };
    await fetch(`${API}/me/country/vn/kyc`, { method: "POST", headers: ch, body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }) });
    const kyc = await fetch(`${API}/me/country/vn/kyc`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/vn/kyc/${kyc.caseId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
    });
    await fetch(`${API}/markets/vn/campaigns/${camp.id}/join`, { method: "POST", headers: { authorization: `Bearer ${creator.token}` } });
    await fetch(`${API}/me/country/vn/campaigns/${camp.id}/content`, { method: "POST", headers: ch, body: JSON.stringify({ url: "https://www.tiktok.com/@e/video/1", caption: "x #e" }) });
    const mine = await fetch(`${API}/me/country/vn/campaigns/${camp.id}/content`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/vn/content/${mine.submissions[0].id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decision: "APPROVE" }),
    });

    window.localStorage.setItem("ag_session", JSON.stringify({ token: creator.token, user: creator.user }));
  });

  await page.goto("/mockup/creator/earnings");
  await expect(page.getByText("Tổng quan thu nhập")).toBeVisible();
  await expect(page.getByText("Sổ cái (append-only)")).toBeVisible();
  // Bút toán ghi nhận thu nhập + khấu trừ thuế xuất hiện trong sổ.
  await expect(page.getByText("Ghi nhận thu nhập")).toBeVisible();
  await expect(page.getByText("Khấu trừ thuế")).toBeVisible();
  // Net 450.000 (500.000 - 10% thuế VN) hiện ở tổng quan.
  await expect(page.getByText("450.000", { exact: false }).first()).toBeVisible();
});
