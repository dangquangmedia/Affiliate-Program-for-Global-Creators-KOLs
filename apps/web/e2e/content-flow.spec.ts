import { test, expect } from "@playwright/test";

// N11: content end-to-end trên trình duyệt — creator (đã join) nộp link qua V06, Ops duyệt qua
// API (luồng UI Ops đã có test API 12 case), creator thấy "Đã được duyệt". Setup qua API cho nhanh.
test("V06 content: creator submits, Ops approves -> creator sees approved + earning note", async ({ page }) => {
  await page.goto("/mockup/creator/login");

  const { campaignId, opsToken } = await page.evaluate(async () => {
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
      body: JSON.stringify({ title: `e2e-content-${Date.now()}`, brand: "B", platform: "TikTok", requiredHashtag: "#e2etag", brief: "", rewardMinor: 100000, slotsTotal: 3 }),
    }).then(j);

    const ops = await login("ops.vn@demo.affiliate.gl");
    const creator = await login(`e2e-content-${Date.now()}@example.com`);
    const ch = { "content-type": "application/json", authorization: `Bearer ${creator.token}` };
    await fetch(`${API}/me/country/vn/kyc`, {
      method: "POST",
      headers: ch,
      body: JSON.stringify({ values: { fullName: "A", idNumber: "1", bankAccount: "2", taxId: "3" } }),
    });
    const kyc = await fetch(`${API}/me/country/vn/kyc`, { headers: { authorization: `Bearer ${creator.token}` } }).then(j);
    await fetch(`${API}/ops/vn/kyc/${kyc.caseId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ops.token}` },
      body: JSON.stringify({ decisions: kyc.fields.map((f: { key: string }) => ({ key: f.key, decision: "ACCEPT" })) }),
    });
    await fetch(`${API}/markets/vn/campaigns/${camp.id}/join`, {
      method: "POST",
      headers: { authorization: `Bearer ${creator.token}` },
    });

    window.localStorage.setItem("ag_session", JSON.stringify({ token: creator.token, user: creator.user }));
    return { campaignId: camp.id as string, opsToken: ops.token as string };
  });

  // Creator nộp bài qua UI V06.
  await page.goto(`/mockup/creator/submit?id=${campaignId}&m=VN`);
  await page.getByPlaceholder(/tiktok\.com/).fill("https://www.tiktok.com/@e2e/video/123");
  await page.getByPlaceholder(/Nội dung caption/).fill("review sản phẩm #e2etag");
  await page.getByRole("button", { name: "Nộp để duyệt" }).click();
  await expect(page.getByText("Đang chờ duyệt")).toBeVisible();

  // Ops duyệt (qua API — UI Ops đã phủ ở test khác) -> exactly-once earning phía server.
  await page.evaluate(
    async ({ campaignId, opsToken }) => {
      const API = "http://localhost:3001";
      const q = await fetch(`${API}/ops/vn/content/queue`, { headers: { authorization: `Bearer ${opsToken}` } }).then((r) => r.json());
      const mineInQueue = q.find((s: { campaignTitle: string }) => s.campaignTitle.startsWith("e2e-content-"));
      await fetch(`${API}/ops/vn/content/${mineInQueue.submissionId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${opsToken}` },
        body: JSON.stringify({ decision: "APPROVE" }),
      });
      void campaignId;
    },
    { campaignId, opsToken },
  );

  // Creator reload -> thấy Đã duyệt + ghi chú thu nhập đúng 1 lần.
  await page.reload();
  await expect(page.getByText("Đã được duyệt 🎉")).toBeVisible();
  await expect(page.getByText(/thu nhập PENDING/)).toBeVisible();

  // My Campaigns hiện badge Đã duyệt.
  await page.goto("/mockup/creator/my-campaigns");
  await expect(page.getByText("Đã duyệt").first()).toBeVisible();
});
