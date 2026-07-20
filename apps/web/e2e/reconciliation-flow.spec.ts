import { test, expect } from "@playwright/test";

// N13: Finance đăng nhập vai, tạo batch đối soát rồi khoá → thu nhập PENDING thành AVAILABLE.
test("V12 reconciliation: Finance creates a batch and locks it", async ({ page }) => {
  await page.goto("/mockup/finance/workbench");

  // Setup: tạo 1 earning PENDING qua API (approve content của 1 creator).
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
      body: JSON.stringify({ title: `e2e-recon-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#r", brief: "", rewardMinor: 500000, slotsTotal: 3 }),
    }).then(j);

    const ops = await login("ops.vn@demo.affiliate.gl");
    const creator = await login(`e2e-recon-${Date.now()}@example.com`);
    const ch = { "content-type": "application/json", authorization: `Bearer ${creator.token}` };
    await fetch(`${API}/me/country/vn/kyc`, { method: "POST", headers: ch, body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }) });
    const kyc = await fetch(`${API}/me/country/vn/kyc`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/vn/kyc/${kyc.caseId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
    });
    await fetch(`${API}/markets/vn/campaigns/${camp.id}/join`, { method: "POST", headers: { authorization: `Bearer ${creator.token}` } });
    await fetch(`${API}/me/country/vn/campaigns/${camp.id}/content`, { method: "POST", headers: ch, body: JSON.stringify({ url: "https://www.tiktok.com/@r/video/1", caption: "x #r" }) });
    const mine = await fetch(`${API}/me/country/vn/campaigns/${camp.id}/content`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/vn/content/${mine.submissions[0].id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decision: "APPROVE" }),
    });
  });

  // Đăng nhập vai Finance VN rồi tạo + khoá batch.
  await page.reload();
  await page.getByRole("button", { name: /Đăng nhập vai Finance VN/ }).click();
  await page.waitForFunction(() => (window.localStorage.getItem("ag_session") ?? "").includes("Finance VN"));

  await page.getByRole("button", { name: "Tạo batch đối soát" }).click();
  // Batch mở ra hiển thị -> khoá.
  await page.getByRole("button", { name: /Khoá batch/ }).click();
  await expect(page.getByText("🔒 LOCKED — không sửa trực tiếp")).toBeVisible();
});
