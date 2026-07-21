import { test, expect } from "@playwright/test";

// SP-1 T1: chọn vai ở landing /portal phải mockLogin THẬT (account seed theo vai+nước)
// rồi mới điều hướng sang đúng dashboard — không phải link tĩnh.
test("chọn vai Ops -> vào /portal/ops với phiên thật", async ({ page }) => {
  await page.goto("/portal");
  await page.getByTestId("enter-ops").click();
  await expect(page).toHaveURL(/\/portal\/ops/);
  const session = await page.evaluate(() => window.localStorage.getItem("ag_session"));
  expect(session).toContain("token");
});
