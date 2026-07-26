import { test, expect, type Page } from "@playwright/test";
import { customerStorageState, adminStorageState } from "../helpers/auth";
import { testEnv } from "../fixtures/env";
import { payWithTestCard } from "../helpers/stripe";
import {
  CHECKOUT_TEST_PRODUCT as PRODUCT,
  addToCart,
  fillAddress,
  submitCheckoutForm,
} from "../helpers/checkout";

// Dedicated QA coupon fixtures (seeded via SQL — see Phase 5 report):
// QA-PERCENT10 (10% off, unrestricted), QA-FIXED20 ($20 off, unrestricted),
// QA-EXPIRED (expired), QA-INACTIVE (inactive), QA-MAXED (max_uses 1,
// used_count 1 — already at its limit), QA-MINORDER (min_order $99999,
// unreachable by the test cart), QA-PAYMENT10 (dedicated to the real
// Stripe payment test below, kept separate so its usage count is
// predictable and never shared with the validation-only tests).

async function applyCoupon(page: Page, code: string) {
  await page.getByLabel("Coupon Code").fill(code);
  await page.getByRole("button", { name: /^apply$/i }).click();
}

test.use({ storageState: customerStorageState });

test.describe("checkout coupons — validation", () => {
  test("applies a valid percentage coupon and updates the total live", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "QA-PERCENT10");

    await expect(page.getByText("QA-PERCENT10 applied")).toBeVisible();
    await expect(page.getByText("10% off")).toBeVisible();
    await expect(page.getByText(/\$24\.00/)).toBeVisible(); // 10% of $240
    await expect(page.getByText("$216.00", { exact: true })).toBeVisible();
  });

  test("applies a valid fixed-amount coupon", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "QA-FIXED20");

    await expect(page.getByText("QA-FIXED20 applied")).toBeVisible();
    await expect(page.getByText("$20 off")).toBeVisible();
    await expect(page.getByText(/\$20\.00/)).toBeVisible();
    await expect(page.getByText("$220.00", { exact: true })).toBeVisible();
  });

  test("rejects a coupon code that doesn't exist", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "NOT-A-REAL-CODE");
    await expect(page.getByText(/doesn't exist/i)).toBeVisible();
  });

  test("rejects an expired coupon", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "QA-EXPIRED");
    await expect(page.getByText(/expired/i)).toBeVisible();
  });

  test("rejects an inactive coupon", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "QA-INACTIVE");
    await expect(page.getByText(/no longer active/i)).toBeVisible();
  });

  test("rejects a coupon that has reached its usage limit", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "QA-MAXED");
    await expect(page.getByText(/usage limit/i)).toBeVisible();
  });

  test("rejects a coupon when the minimum purchase isn't met", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "QA-MINORDER");
    await expect(page.getByText(/minimum purchase/i)).toBeVisible();
  });

  test("removing an applied coupon reverts to the coupon entry form", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await applyCoupon(page, "QA-PERCENT10");
    await expect(page.getByText("QA-PERCENT10 applied")).toBeVisible();

    await page.getByRole("button", { name: /remove/i }).click();
    await expect(page.getByLabel("Coupon Code")).toBeVisible();
    await expect(page.getByText("QA-PERCENT10 applied")).not.toBeVisible();
    await expect(page.getByText(/\$24\.00/)).not.toBeVisible();
  });
});

test.describe.serial("coupon + real Stripe payment", () => {
  test("completes a discounted payment and Stripe charges the reduced total", async ({
    page,
  }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillAddress(page);
    await applyCoupon(page, "QA-PAYMENT10");
    await expect(page.getByText("QA-PAYMENT10 applied")).toBeVisible();

    await submitCheckoutForm(page);
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });

    // The proof that matters: Stripe's own hosted page — not our UI —
    // reflects the discounted amount, confirming the server-computed
    // discount is what actually gets charged, not just displayed.
    // Stripe renders the amount in both a compact summary and an expanded
    // details section simultaneously (only one visible at a time via CSS,
    // but both present in the DOM) — .first() is enough to prove the value.
    await expect(page.getByText("$216.00").first()).toBeVisible({ timeout: 10_000 });

    await payWithTestCard(page);
    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.getByRole("heading", { name: /order is confirmed/i })).toBeVisible();
    await expect(page.locator("article")).toBeVisible({ timeout: 15_000 });
  });

  test("stores the coupon on the order and shows it in customer order history", async ({
    page,
  }) => {
    await page.goto("/account/orders");
    const article = page.locator("article").first();
    await expect(article).toBeVisible();
    await expect(article.getByText(PRODUCT.name)).toBeVisible();
    await expect(article.getByText(/QA-PAYMENT10/)).toBeVisible();
    await expect(article.getByText(/original total/i)).toBeVisible();
    await expect(article.getByText(/final total paid/i)).toBeVisible();
    // Rendered via un-formatted template interpolation (matching the rest
    // of this page's existing style) rather than toFixed(2), so a whole
    // number may show as "$216" rather than "$216.00" — match loosely.
    // The header total and the coupon summary's "Final Total Paid" both
    // correctly show it, so .first() is enough to confirm the value.
    await expect(article.getByText(/\$216(\.00)?\b/).first()).toBeVisible();
  });

  test("shows the coupon in the admin order detail and order search still works", async ({
    browser,
  }) => {
    const adminContext = await browser.newContext({ storageState: adminStorageState });
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin/orders");
    await adminPage.getByLabel("Search orders").fill(testEnv.customerEmail);

    const row = adminPage.getByRole("button", { name: /paid/i }).first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(adminPage.getByText(/QA-PAYMENT10/)).toBeVisible();
    await expect(adminPage.getByText("Original Total")).toBeVisible();
    await expect(adminPage.getByText("Final Paid")).toBeVisible();
    await adminContext.close();
  });

  test("increments the coupon's usage count after payment succeeds", async ({ browser }) => {
    const adminContext = await browser.newContext({ storageState: adminStorageState });
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin/coupons");
    await adminPage.getByLabel("Search coupons").fill("QA-PAYMENT10");
    await expect(adminPage.getByText("QA-PAYMENT10", { exact: true })).toBeVisible();
    await adminPage.getByText("QA-PAYMENT10", { exact: true }).click();

    await expect(adminPage.getByText(/^1 used/)).toBeVisible();
    await adminContext.close();
  });
});
