import { expect, test } from "@playwright/test";

test("loads the proposal workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Proposal AI" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Extract fields/i })).toBeVisible();
  await page.getByRole("button", { name: /Extract fields/i }).click();
  await expect(page.getByRole("button", { name: /Generate proposal/i })).toBeVisible();
});
