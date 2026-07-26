import { test, expect } from "@playwright/test";
import { adminStorageState } from "../helpers/auth";
import { testEnv } from "../fixtures/env";

// A real paid order (with correct admin-sync rendering) already exists as
// a byproduct of tests/payments/stripe-payments.spec.ts. This file covers
// what that one doesn't: searching/filtering the list, and the admin's own
// manual status-update controls — exercised against a dedicated fixture
// order for the QA customer so it doesn't depend on or compete with the
// shared Stripe checkout-session rate limit.
//
// That fixture currently has to be seeded (and torn down) with direct,
// service-role-level SQL: RLS permits a customer to INSERT their own
// order/order_items (see "Create own order" / "Add items to own pending
// order" policies), but there is no DELETE policy for either the customer
// or the plain admin-client role on orders/order_items — orders are
// intentionally not customer- or admin-client-deletable, only ever
// cancelled. Until this suite's CI setup has its own service-role seed
// step (the same gap noted for the rate-limit test in tests/checkout),
// running these specific tests means re-seeding that fixture first.

test.use({ storageState: adminStorageState });

test.describe("admin orders", () => {
  test("searches orders by customer email", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.getByLabel("Search orders").fill(testEnv.customerEmail);
    await expect(page.getByRole("button", { name: /pending/i }).first()).toBeVisible();
  });

  test("shows an empty state for a search with no matches", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.getByLabel("Search orders").fill("no-such-customer-xyz@example.com");
    await expect(page.getByText(/no orders match/i)).toBeVisible();
  });

  test("expands an order to show line items and status controls", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.getByLabel("Search orders").fill(testEnv.customerEmail);
    await page.getByRole("button", { name: /pending/i }).first().click();

    await expect(page.getByText("Oxford Shirt")).toBeVisible();
    await expect(page.getByLabel("Order Status")).toBeVisible();
    await expect(page.getByLabel("Payment")).toBeVisible();
    await expect(page.getByLabel("Shipping")).toBeVisible();
  });

  test("updates and persists the shipping status", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.getByLabel("Search orders").fill(testEnv.customerEmail);
    await page.getByRole("button", { name: /pending/i }).first().click();

    // The select updates optimistically before the write lands, and there's
    // no visible confirmation for this action — waiting on the actual PATCH
    // response is the only reliable signal that it's safe to reload.
    const saved = page.waitForResponse(
      (res) => res.url().includes("/rest/v1/orders") && res.request().method() === "PATCH"
    );
    await page.getByLabel("Shipping").selectOption("shipped");
    await saved;
    await page.reload();

    await page.getByLabel("Search orders").fill(testEnv.customerEmail);
    await page.getByRole("button", { name: /shipped/i }).first().click();
    await expect(page.getByLabel("Shipping")).toHaveValue("shipped");
  });
});
