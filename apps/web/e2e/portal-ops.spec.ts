import { test, expect } from "@playwright/test";

test("ops dashboard fetch content queue thật", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-ops").click();
  await expect(page).toHaveURL(/\/portal\/ops/);
  // queue là danh sách thật (có thể rỗng) — testid container phải tồn tại
  await expect(page.getByTestId("ops-content-queue")).toBeVisible();
});
