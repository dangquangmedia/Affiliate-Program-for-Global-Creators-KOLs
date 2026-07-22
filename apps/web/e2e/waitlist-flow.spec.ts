import { test, expect } from "@playwright/test";

// N10b (QĐ-5): campaign 1 suất, creator A giữ suất, creator B bấm join khi đầy -> vào HÀNG CHỜ
// (không phải lỗi 500), thấy vị trí #1 trên V05. Setup qua API cho nhanh; phiên cuối = B.
test("V05 waitlist: joining a full campaign puts the creator in the queue with a position", async ({ page }) => {
  await page.goto("/mockup/creator/login");

  const campaignId = await page.evaluate(async () => {
    const API = "http://localhost:3101";
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
      body: JSON.stringify({ title: `e2e-wl-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#x", brief: "", rewardMinor: 100000, slotsTotal: 1 }),
    }).then(j);

    const ops = await login("ops.vn@demo.affiliate.gl");
    const approve = async (token: string) => {
      const ch = { "content-type": "application/json", authorization: `Bearer ${token}` };
      await fetch(`${API}/me/country/vn/kyc`, {
        method: "POST",
        headers: ch,
        body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }),
      });
      const kyc = await fetch(`${API}/me/country/vn/kyc`, { headers: { authorization: `Bearer ${token}` } }).then(j);
      await fetch(`${API}/ops/vn/kyc/${kyc.caseId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
        body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
      });
    };

    // A giữ suất duy nhất.
    const a = await login(`e2e-wl-a-${Date.now()}@example.com`);
    await approve(a.token);
    await fetch(`${API}/markets/vn/campaigns/${camp.id}/join`, { method: "POST", headers: { authorization: `Bearer ${a.token}` } });

    // B là phiên trên trình duyệt (sẽ bấm Vào hàng chờ).
    const b = await login(`e2e-wl-b-${Date.now()}@example.com`);
    await approve(b.token);
    window.localStorage.setItem("ag_session", JSON.stringify({ token: b.token, user: b.user }));
    return camp.id as string;
  });

  await page.goto(`/mockup/creator/campaign?id=${campaignId}&m=VN`);
  await page.getByRole("button", { name: "Vào hàng chờ" }).click();
  await expect(page.getByText("Bạn đang trong hàng chờ")).toBeVisible();
  await expect(page.getByText(/vị trí #1/)).toBeVisible();
});
