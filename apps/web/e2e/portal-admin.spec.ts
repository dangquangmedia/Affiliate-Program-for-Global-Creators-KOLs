import { test, expect } from "@playwright/test";

test("admin tạo campaign -> xuất hiện trong danh sách", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-admin").click();
  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByTestId("admin-campaign-list")).toBeVisible();
});
