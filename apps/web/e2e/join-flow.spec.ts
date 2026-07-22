import { test, expect } from "@playwright/test";

// N10: Join end-to-end trên trình duyệt — creator (đã KYC duyệt) join campaign thật, thấy
// "Đã tham gia", và campaign hiện ở "Chiến dịch của tôi". Setup (tạo campaign + duyệt KYC) làm
// qua API trong page.evaluate cho nhanh; localStorage cuối cùng giữ phiên creator.
test("V05 join: approved creator joins a campaign and sees it in My Campaigns", async ({ page }) => {
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

    // Admin tạo campaign mới (tránh đụng dữ liệu seed/các lần chạy trước).
    const admin = await login("admin.vn@demo.affiliate.gl");
    const camp = await fetch(`${API}/markets/vn/campaigns`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ title: `e2e-join-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#x", brief: "", rewardMinor: 100000, slotsTotal: 5 }),
    }).then(j);

    // Creator đăng nhập + nộp KYC.
    const creator = await login(`e2e-join-creator-${Date.now()}@example.com`);
    const ch = { "content-type": "application/json", authorization: `Bearer ${creator.token}` };
    await fetch(`${API}/me/country/vn/kyc`, {
      method: "POST",
      headers: ch,
      body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }),
    });
    const kyc = await fetch(`${API}/me/country/vn/kyc`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);

    // Ops duyệt KYC.
    const ops = await login("ops.vn@demo.affiliate.gl");
    await fetch(`${API}/ops/vn/kyc/${kyc.caseId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
    });

    // Phiên cuối = creator.
    window.localStorage.setItem("ag_session", JSON.stringify({ token: creator.token, user: creator.user }));
    return camp.id as string;
  });

  // Vào detail campaign vừa tạo và Join.
  await page.goto(`/mockup/creator/campaign?id=${campaignId}&m=VN`);
  await page.getByRole("button", { name: "Tham gia campaign" }).click();
  await expect(page.getByText("Đã tham gia")).toBeVisible();

  // Chiến dịch của tôi hiển thị campaign đã join + trạng thái đang giữ suất.
  await page.goto("/mockup/creator/my-campaigns");
  await expect(page.getByText("Đang giữ suất").first()).toBeVisible();
});
