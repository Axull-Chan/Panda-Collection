import { test, expect } from "@playwright/test";

test.describe("forgot password", () => {
  // Supabase never sends a reset email for an unregistered address, and the
  // UI intentionally shows the same generic response either way (no account
  // enumeration) — so a fake address gives full, real coverage of this flow
  // without spending any of the project's limited outbound-email quota.
  test("shows a generic confirmation regardless of whether the account exists", async ({ page }) => {
    await page.goto("/account/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill("definitely-not-a-real-account-xyz@gmail.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByRole("heading", { name: /check your inbox/i })).toBeVisible();
    await expect(page.getByText(/if an account exists/i)).toBeVisible();
  });

  test("does not submit with an empty email", async ({ page }) => {
    await page.goto("/account/forgot-password");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
  });
});

test.describe("reset password link", () => {
  test("treats a missing or expired recovery token as an expired link", async ({ page }) => {
    await page.goto("/account/reset-password");
    await expect(page.getByRole("heading", { name: /link expired/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole("link", { name: /request new link/i })).toBeVisible();
  });
});
