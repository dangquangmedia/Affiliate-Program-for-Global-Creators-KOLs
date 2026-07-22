import { test, expect } from "@playwright/test";

// N8: KYC end-to-end trên trình duyệt — creator nộp, Ops (đăng nhập vai) duyệt theo field,
// creator thấy "Đã duyệt". Lưu ý: cùng 1 trình duyệt chỉ giữ 1 session (ag_session); khi
// "đăng nhập vai Ops" sẽ ghi đè phiên creator, nên bước cuối phải khôi phục phiên creator
// (đời thực = 2 người/2 máy khác nhau).
test("KYC: creator submits, Ops approves, creator sees approved", async ({ page }) => {
  const ts = Date.now();
  const email = `e2e-kyc-${ts}@example.com`;
  const creatorName = `E2E KYC ${ts}`; // tên duy nhất để không đụng case cũ trong hàng đợi

  async function loginAs(e: string, name: string): Promise<string> {
    return page.evaluate(
      async ({ e, name }) => {
        const s = await fetch("http://localhost:3101/auth/mock-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: e, displayName: name }),
        }).then((r) => r.json());
        const session = JSON.stringify({ token: s.token, user: s.user });
        window.localStorage.setItem("ag_session", session);
        return session;
      },
      { e, name },
    );
  }

  // 1) Creator đăng nhập (mock SSO), giữ lại phiên để khôi phục sau.
  await page.goto("/mockup/creator/login");
  const creatorSession = await loginAs(email, creatorName);

  // 2) Creator nộp KYC ở VN.
  await page.goto("/mockup/creator/kyc");
  await expect(page.getByText("Thông tin định danh")).toBeVisible();
  for (const label of ["Họ và tên", "Số CCCD/ID", "Tài khoản ngân hàng", "Mã số thuế"]) {
    await page.getByPlaceholder(label).fill("demo-" + label);
  }
  await page.getByRole("button", { name: "Nộp KYC" }).click();
  await expect(page.getByText(/Chờ Ops duyệt/)).toBeVisible();

  // 3) Ops VN đăng nhập vai (ghi đè phiên) và duyệt ĐÚNG case của creator này -> gửi quyết định.
  await page.goto("/mockup/ops/review");
  await page.getByRole("button", { name: /Đăng nhập vai Ops VN/ }).click();
  const block = page.locator(`[data-creator="${creatorName}"]`);
  await expect(block).toBeVisible();
  await block.getByRole("button", { name: "Gửi quyết định" }).click();
  await expect(block).toHaveCount(0); // case này rời hàng đợi sau khi duyệt

  // 4) Khôi phục phiên creator rồi xem lại KYC -> Đã duyệt.
  await page.evaluate((s) => window.localStorage.setItem("ag_session", s), creatorSession);
  await page.goto("/mockup/creator/kyc");
  await expect(page.getByText(/Danh tính đã xác minh/)).toBeVisible();
});
