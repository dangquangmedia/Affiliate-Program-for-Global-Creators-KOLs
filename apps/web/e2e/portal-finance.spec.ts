import { test, expect } from "@playwright/test";

test("finance dashboard fetch batch + payout queue thật", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-finance").click();
  await expect(page).toHaveURL(/\/portal\/finance/);
  await expect(page.getByTestId("finance-payout-queue")).toBeVisible();
});
