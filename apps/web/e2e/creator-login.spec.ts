import { test, expect } from "@playwright/test";

// N7: nút SSO (mock) trên V01 phải gọi API auth THẬT (tạo user+session trong DB) rồi hiện
// danh tính đã đăng nhập — không còn là hình tĩnh.
test("V01 login: clicking mock Google actually authenticates via the API", async ({ page }) => {
  await page.goto("/mockup/creator/login");

  await page.getByRole("button", { name: /Đăng nhập với Google/ }).click();

  // Sau khi API trả session: card "Đã đăng nhập" + email danh tính demo hiện ra.
  await expect(page.getByText("Đã đăng nhập")).toBeVisible();
  await expect(page.getByText("creator.google@demo.affiliate.gl")).toBeVisible();

  // Đăng xuất đưa về lại nút đăng nhập.
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page.getByRole("button", { name: /Đăng nhập với Google/ })).toBeVisible();
});
