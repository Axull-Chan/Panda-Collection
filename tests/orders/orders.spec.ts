import { test, expect } from "@playwright/test";
import { customerStorageState } from "../helpers/auth";

// The populated case (an order actually appearing, with correct status,
// totals, and admin sync) is exercised for real by
// tests/payments/stripe-payments.spec.ts — a genuine paid order is a
// byproduct of that suite's own real Stripe test-mode payment, and
// creating a second one here just to re-check the same rendering would
// mean either another real checkout session (shared, rate-limited
// infrastructure) or a fabricated DB row that no real user workflow
// produces. This file covers what that suite doesn't: the page on its
// own, with nothing to show yet.

test.use({ storageState: customerStorageState });

test.describe("orders page", () => {
  test("shows an empty state with a link back to the collection", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
    await expect(page.getByText(/no orders yet/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /explore collection/i })).toBeVisible();
  });

  test("links back to the account page", async ({ page }) => {
    await page.goto("/account/orders");
    await page.getByRole("link", { name: /back to my account/i }).click();
    await expect(page).toHaveURL(/\/account$/);
  });
});
