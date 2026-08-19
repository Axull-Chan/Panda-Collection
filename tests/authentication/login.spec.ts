import { test, expect } from "@playwright/test";
import { testEnv } from "../fixtures/env";

test.describe("sign in form", () => {
  test("signs in with valid credentials and lands on /account", async ({ page }) => {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(testEnv.customerEmail);
    await page.getByLabel("Password", { exact: true }).fill(testEnv.customerPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("rejects an incorrect password", async ({ page }) => {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(testEnv.customerEmail);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/account\/sign-in/);
  });

  test("rejects an email that isn't registered, with the same generic message", async ({ page }) => {
    // Same copy as a wrong password on a real account — the app must not
    // reveal whether an email is registered (account enumeration).
    await page.goto("/account/sign-in");
    await page.getByLabel("Email", { exact: true }).fill("no-such-account-anywhere-xyz@gmail.com");
    await page.getByLabel("Password", { exact: true }).fill("whatever-password-1");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/account\/sign-in/);
  });

  test("handles an empty submission without hanging or crashing", async ({ page }) => {
    await page.goto("/account/sign-in");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/account\/sign-in/);
    await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });
});

test.describe("signed-in session", () => {
  // Deliberately not customerStorageState: these tests sign a session out
  // (or corrupt it) as their whole point, and customerStorageState is the
  // single shared session every other spec file's test.use() also loads —
  // ending it here would silently break every test that runs afterward in
  // the same suite run. Each test signs in fresh instead, so it only ever
  // affects a session of its own.
  test.beforeEach(async ({ page }) => {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(testEnv.customerEmail);
    await page.getByLabel("Password", { exact: true }).fill(testEnv.customerPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("survives a reload", async ({ page }) => {
    await page.reload();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("signs out and blocks further access to the account", async ({ page }) => {
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();

    await page.goto("/account");
    await expect(page).toHaveURL(/\/account\/sign-in/);
  });

  test("a tampered session is treated as signed out, not left in a broken state", async ({ page }) => {
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (key) {
        localStorage.setItem(
          key,
          JSON.stringify({ access_token: "corrupted", refresh_token: "corrupted" })
        );
      }
    });
    await page.reload();

    await expect(page.getByRole("heading", { name: /welcome back/i })).not.toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("remember me", () => {
  test("stays signed in in a new tab when remember me is checked", async ({ page, context }) => {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(testEnv.customerEmail);
    await page.getByLabel("Password", { exact: true }).fill(testEnv.customerPassword);
    // "Remember me" defaults to checked — left alone here on purpose.
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    const secondTab = await context.newPage();
    await secondTab.goto("/account");
    await expect(secondTab.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await secondTab.close();
  });

  test("signs out in a new tab when remember me is unchecked", async ({ page, context }) => {
    await page.goto("/account/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(testEnv.customerEmail);
    await page.getByLabel("Password", { exact: true }).fill(testEnv.customerPassword);
    // Not .uncheck(): the input is sr-only (a decorative span is the visible
    // checkbox), so Playwright's actionability check on the input itself
    // fails. Clicking the visible label text is what a real user does, and
    // native <label> semantics forward it to the input either way. Checked
    // defaults to true on a fresh page, so one click reliably unchecks it.
    await page.getByText("Remember me", { exact: true }).click();
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    const secondTab = await context.newPage();
    await secondTab.goto("/account");
    await expect(secondTab).toHaveURL(/\/account\/sign-in/);
    await secondTab.close();
  });
});
