import { test, expect } from "@playwright/test";

async function loginViaApi(page: import("@playwright/test").Page, email: string, name: string): Promise<void> {
  await page.goto("/mockup/creator/login");
  await page.evaluate(
    async ({ email, name }) => {
      const s = await fetch("http://localhost:3001/auth/mock-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, displayName: name }),
      }).then((r) => r.json());
      window.localStorage.setItem("ag_session", JSON.stringify({ token: s.token, user: s.user }));
    },
    { email, name },
  );
}

// N9: discover lấy campaign THẬT theo nước; "Đầy" suy ra từ số suất (cà phê 30/30).
test("V04 discover: lists VN campaigns from API, shows derived Full", async ({ page }) => {
  await loginViaApi(page, `e2e-discover-${Date.now()}@example.com`, "E2E Discover");
  await page.goto("/mockup/creator/discover");

  await expect(page.getByRole("heading", { name: "Review son mùa hè" }).first()).toBeVisible();
  await expect(page.getByText("Đã đầy").first()).toBeVisible(); // cà phê lon 30/30 -> suy ra Full
  // Campaign PH không lọt vào VN.
  await expect(page.getByText("Snack taste test")).toHaveCount(0);
});

// N9: Local Admin đăng nhập vai và tạo campaign thật qua builder.
test("V11 builder: Admin logs in and creates a campaign", async ({ page }) => {
  await page.goto("/mockup/admin/campaign-builder");
  await page.getByRole("button", { name: /Đăng nhập vai Admin VN/ }).click();
  await page.getByRole("button", { name: /Tạo campaign/ }).click();

  await expect(page.getByText("Đã tạo campaign")).toBeVisible();
  await expect(page.getByRole("link", { name: /Xem ở Khám phá/ })).toBeVisible();
});
