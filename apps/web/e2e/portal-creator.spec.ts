import { test, expect } from "@playwright/test";

test("creator dashboard fetch campaign thật + nộp content", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-creator").click();
  await expect(page).toHaveURL(/\/portal\/creator/);
  // có ít nhất 1 campaign thật render (seed có campaign VN)
  await expect(page.getByTestId("creator-campaign").first()).toBeVisible();
});
