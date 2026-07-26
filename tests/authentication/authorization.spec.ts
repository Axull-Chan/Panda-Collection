import { test, expect } from "@playwright/test";
import { testEnv } from "../fixtures/env";

const PROTECTED_PATHS = ["/account", "/account/wishlist", "/account/orders", "/checkout"];

test.describe("unauthorized access to protected routes", () => {
  for (const path of PROTECTED_PATHS) {
    test(`redirects ${path} to sign-in when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/account\/sign-in/);
    });
  }
});

test.describe("post-login redirect", () => {
  test("returns to the originally requested page after signing in", async ({ page }) => {
    await page.goto("/account/wishlist");
    await expect(page).toHaveURL(/\/account\/sign-in/);

    await page.getByLabel("Email", { exact: true }).fill(testEnv.customerEmail);
    await page.getByLabel("Password", { exact: true }).fill(testEnv.customerPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/account\/wishlist$/);
  });
});
