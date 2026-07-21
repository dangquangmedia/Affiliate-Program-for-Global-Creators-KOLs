import { test, expect } from "@playwright/test";

test("global admin thấy audit feed toàn cục", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-global").click();
  await expect(page).toHaveURL(/\/portal\/global/);
  await expect(page.getByTestId("global-audit-feed")).toBeVisible();
});
