import { expect, test } from "@playwright/test";

test("loads the proposal workflow", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Proposal AI" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Use sample intake/i })).toBeVisible();
  await page.getByRole("button", { name: /Use sample intake/i }).click();
  await expect(page.getByRole("button", { name: /Generate proposal/i })).toBeVisible();
});
