import { test, expect } from "@playwright/test";
import { customerStorageState, adminStorageState } from "../helpers/auth";

/**
 * Sanity-checks the output of global-setup.ts itself: that both dedicated
 * QA accounts actually authenticate and that their roles are wired through
 * the real app (AuthContext + RequireAdmin), not just correct in the DB.
 * Every other spec file trusts these storage states without re-verifying
 * them — if this file goes red, treat every other test result as suspect.
 */

test.describe("customer session", () => {
  test.use({ storageState: customerStorageState });

  test("lands authenticated on /account", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("is denied the admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /this area is private/i })).toBeVisible();
  });
});

test.describe("admin session", () => {
  test.use({ storageState: adminStorageState });

  test("lands authenticated on /account", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("reaches the admin dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /this area is private/i })).not.toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("no session", () => {
  test("is redirected to sign-in from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account\/sign-in/);
  });
});
