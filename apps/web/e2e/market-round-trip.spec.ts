import { test, expect } from "@playwright/test";

test("home page links to VN and PH markets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("link-vn")).toBeVisible();
  await expect(page.getByTestId("link-ph")).toBeVisible();
});

test("/vn renders Vietnam context sourced from the database", async ({ page }) => {
  await page.goto("/vn");
  await expect(page.getByTestId("market-code")).toHaveText("VN");
  await expect(page.getByTestId("market-locale")).toHaveText("vi-VN");
  await expect(page.getByTestId("market-currency")).toHaveText("VND");
  await expect(page.getByTestId("market-enabled")).toHaveText("true");
});

test("/ph renders Philippines context sourced from the database", async ({ page }) => {
  await page.goto("/ph");
  await expect(page.getByTestId("market-code")).toHaveText("PH");
  await expect(page.getByTestId("market-locale")).toHaveText("fil-PH");
  await expect(page.getByTestId("market-currency")).toHaveText("PHP");
});

test("an unknown market renders a controlled not-found page, not a fake market", async ({ page }) => {
  const response = await page.goto("/xx");
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("market-context")).toHaveCount(0);
});
