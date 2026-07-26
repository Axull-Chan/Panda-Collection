import { test, expect } from "@playwright/test";
import { customerStorageState } from "../helpers/auth";
import { testEnv } from "../fixtures/env";

test.use({ storageState: customerStorageState });

test.describe("account page", () => {
  test("loads with profile, wishlist, and orders sections", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    // Appears twice (the profile field and "Signed in as..." in Settings).
    await expect(page.getByText(testEnv.customerEmail).first()).toBeVisible();

    await expect(page.getByRole("heading", { name: "Wishlist" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();
  });

  test("updates and persists the editable profile fields", async ({ page }) => {
    await page.goto("/account");
    const fullNameField = page.getByLabel("Full Name");
    const originalName = await fullNameField.inputValue();

    try {
      await fullNameField.fill("QA Playwright Tester");
      await page.getByLabel("Phone").fill("+351 900 000 000");
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByText("Saved.")).toBeVisible();

      await page.reload();
      await expect(page.getByLabel("Full Name")).toHaveValue("QA Playwright Tester");
      await expect(page.getByLabel("Phone")).toHaveValue("+351 900 000 000");
    } finally {
      // Restore the shared QA account's original name so it doesn't drift
      // across unrelated test runs (e.g. login tests asserting "Welcome back").
      await page.goto("/account");
      await page.getByLabel("Full Name").fill(originalName);
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
    }
  });
});
