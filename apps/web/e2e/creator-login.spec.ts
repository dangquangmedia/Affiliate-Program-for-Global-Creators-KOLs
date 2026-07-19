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

// N7: sau đăng nhập, chọn nước tạo creator_country_profile THẬT + hiện ngữ cảnh từ DB.
test("V02 country: choosing VN creates a real profile scoped to the session", async ({ page }) => {
  await page.goto("/mockup/creator/login");
  await page.getByRole("button", { name: /Đăng nhập với Google/ }).click();
  await expect(page.getByText("Đã đăng nhập")).toBeVisible();

  await page.goto("/mockup/creator/country");
  await page.getByRole("button", { name: /Tạo hồ sơ/ }).first().click();

  // Ngữ cảnh nước lấy từ DB hiện ra, kèm tiền format theo locale vi-VN (500.000 ₫).
  await expect(page.getByText(/Ngữ cảnh từ DB/)).toBeVisible();
  await expect(page.getByText(/500\.000\s*₫/)).toBeVisible();
});

// N7: chưa đăng nhập thì màn country yêu cầu login, không tạo hồ sơ lén.
test("V02 country: requires login first", async ({ page }) => {
  await page.goto("/mockup/creator/login");
  // đảm bảo sạch session
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/mockup/creator/country");
  await expect(page.getByText(/cần đăng nhập/)).toBeVisible();
});
