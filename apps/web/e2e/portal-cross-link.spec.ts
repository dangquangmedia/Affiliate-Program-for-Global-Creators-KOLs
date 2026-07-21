import { test, expect } from "@playwright/test";

// SP-1 T7 (CAPSTONE): cross-link trọn spine tiền TRONG /portal (không phải /mockup).
// Creator nộp content (UI) -> Ops thấy & duyệt (UI) -> earning PENDING -> Finance tạo batch +
// khoá (UI) -> Creator yêu cầu rút (UI) -> Finance settle SUCCESS (UI) -> Creator thấy PAID (UI).
//
// Nền tảng dựng qua page.evaluate gọi API thật (giống payout-fail-flow.spec.ts): campaign mới +
// KYC APPROVED + join, tất cả chạy trên CHÍNH tài khoản seed mà nút "enter-creator" ở landing sẽ
// đăng nhập vào (creator.vn@demo.affiliate.gl — xem apps/web/src/app/portal/session.ts roleEmail),
// để khi bấm enter-creator trên UI, phiên mới trỏ đúng vào user đã có campaign/KYC/join sẵn.
test("cross-link money spine trọn trong /portal", async ({ page }) => {
  // next dev cold-compile 1 route lần đầu có thể trễ hydrate sau khi window.location.assign điều
  // hướng cứng (enterAs) -> click nav đầu tiên có thể "rơi" vào lúc chưa gắn onClick. Bọc bằng
  // toPass để tự click lại tới khi tab thật sự đổi (marker text chỉ có ở tab đích xuất hiện).
  // Scope vào <aside> sidebar (nav thật) — tránh khớp nhầm nút khác chứa cùng chữ, ví dụ
  // "Chiến dịch" là substring của "Join chiến dịch" trong lưới campaign ở main content.
  async function switchTab(label: string, ready: () => Promise<unknown>) {
    await expect(async () => {
      await page.locator("aside").getByRole("button", { name: label }).click();
      await ready();
    }).toPass({ timeout: 20_000 });
  }

  const unique = Date.now();
  const campaignTitle = `E2E-Cross-${unique}`;
  const contentUrl = `https://www.tiktok.com/@e2ecross/video/${unique}`;

  await page.goto("/portal");

  await page.evaluate(async ({ campaignTitle, hashtag }) => {
    const API = "http://localhost:3001";
    const j = (r: Response) => r.json();
    const login = (email: string, displayName?: string) =>
      fetch(`${API}/auth/mock-login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      }).then(j);

    const admin = await login("admin.vn@demo.affiliate.gl");
    const camp = await fetch(`${API}/markets/vn/campaigns`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        title: campaignTitle,
        brand: "E2E Cross Brand",
        platform: "TikTok",
        requiredHashtag: hashtag,
        brief: "",
        rewardMinor: 900000,
        slotsTotal: 3,
      }),
    }).then(j);

    const ops = await login("ops.vn@demo.affiliate.gl");
    // Tài khoản seed CỐ ĐỊNH mà enter-creator dùng (roleEmail("creator","VN")) — không phải
    // email ngẫu nhiên, để phiên UI sau này (mockLogin lại) trỏ đúng cùng 1 user/hồ sơ.
    const creator = await login("creator.vn@demo.affiliate.gl", "Creator VN");
    const ch = { "content-type": "application/json", authorization: `Bearer ${creator.token}` };
    await fetch(`${API}/me/country/vn/kyc`, {
      method: "POST",
      headers: ch,
      body: JSON.stringify({ values: { fullName: "Creator VN", idNumber: "1", bankAccount: "2", taxId: "3" } }),
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
  }, { campaignTitle, hashtag: "#e2ecross" });

  // ---- 1) Creator vào /portal, nộp content qua UI thật (V06 trong /portal) ----
  await page.getByTestId("enter-creator").click();
  await expect(page).toHaveURL(/\/portal\/creator/);

  await switchTab("Chiến dịch", () => expect(page.getByText("Chiến dịch của tôi").first()).toBeVisible({ timeout: 2000 }));
  const myRow = page.locator("tr", { hasText: campaignTitle });
  await expect(myRow).toBeVisible();
  await myRow.getByRole("button", { name: "Nộp nội dung" }).click();
  await page.getByPlaceholder("https://...").fill(contentUrl);
  await page.getByPlaceholder("Nội dung caption kèm hashtag").fill("Review sản phẩm #e2ecross");
  await page.getByTestId("creator-submit-content").click();
  // Form đóng lại sau khi nộp thành công (submitFor -> null).
  await expect(page.getByTestId("creator-submit-content")).toHaveCount(0);

  // ---- 2) Ops vào /portal, thấy đúng link creator vừa nộp, duyệt ----
  await page.goto("/portal");
  await page.getByTestId("enter-ops").click();
  await expect(page).toHaveURL(/\/portal\/ops/);

  const opsQueue = page.getByTestId("ops-content-queue");
  await expect(opsQueue).toContainText(campaignTitle);
  await expect(opsQueue).toContainText("tiktok");
  const opsItem = opsQueue
    .locator(`div:has-text("${campaignTitle}")`)
    .filter({ has: page.getByTestId("ops-approve-content") })
    .last();
  await opsItem.getByTestId("ops-approve-content").click();
  // Duyệt xong -> rớt khỏi hàng đợi (SUBMITTED -> APPROVED, tạo đúng 1 earning PENDING).
  await expect(opsQueue).not.toContainText(campaignTitle);

  // ---- 3) Finance vào /portal, tạo batch đối soát + khoá (PENDING -> AVAILABLE) ----
  await page.goto("/portal");
  await page.getByTestId("enter-finance").click();
  await expect(page).toHaveURL(/\/portal\/finance/);

  // Marker phải là testid finance-create-batch (chỉ render ở tab "recon") — text "Batch đối
  // soát" bị trùng substring với "Batch đối soát đang mở" ở tab Tổng quan nên không phân biệt được.
  await switchTab("Đối soát", () => expect(page.getByTestId("finance-create-batch")).toBeVisible({ timeout: 2000 }));
  await page.getByTestId("finance-create-batch").click();
  // Batch mới nhất (createdAt desc) luôn ở HÀNG ĐẦU -> chọn theo VỊ TRÍ (không theo text "Đang
  // mở") để locator vẫn đúng dòng sau khi trạng thái đổi thành "Đã khoá" (text-based sẽ hết khớp).
  const newBatchRow = page.locator("tbody tr").first();
  await expect(newBatchRow).toContainText("Đang mở");
  await newBatchRow.getByRole("button", { name: "Khoá batch" }).click();
  await expect(newBatchRow).toContainText("Đã khoá");

  // ---- 4) Creator quay lại, yêu cầu rút tiền qua UI (OTP tự động, N14) ----
  await page.goto("/portal");
  await page.getByTestId("enter-creator").click();
  await switchTab("Ví & rút tiền", () => expect(page.getByTestId("creator-request-payout")).toBeVisible({ timeout: 2000 }));
  await expect(page.getByTestId("creator-request-payout")).toBeEnabled();
  await page.getByTestId("creator-request-payout").click();
  await expect(page.getByTestId("creator-payout-history")).toContainText("Đang xử lý");

  // ---- 5) Finance vào lại, settle payout SUCCESS (mock provider) ----
  await page.goto("/portal");
  await page.getByTestId("enter-finance").click();
  const payoutQueue = page.getByTestId("finance-payout-queue");
  // Hàng đợi PROCESSING order asc theo requestedAt -> lệnh mới nhất (của chúng ta) luôn ở CUỐI.
  // Chọn theo vị trí (không theo text creatorName) — tránh đụng payout PROCESSING còn sót của
  // account khác trong cùng nước.
  const payoutRow = payoutQueue.locator("tbody tr").last();
  await expect(payoutRow).toContainText("Creator VN");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/payouts/") && r.url().includes("/settle") && r.request().method() === "POST"),
    payoutRow.getByRole("button", { name: "Thành công" }).click(),
  ]);

  // ---- 6) Creator quay lại, ví phản ánh payout PAID — tiền đã đi trọn vòng qua /portal ----
  await page.goto("/portal");
  await page.getByTestId("enter-creator").click();
  await switchTab("Ví & rút tiền", () => expect(page.getByTestId("creator-request-payout")).toBeVisible({ timeout: 2000 }));
  await expect(page.getByTestId("creator-payout-history")).toContainText("Đã chi trả");
});
