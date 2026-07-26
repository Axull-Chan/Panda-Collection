import { test, expect, type Page } from "@playwright/test";
import { customerStorageState, adminStorageState } from "../helpers/auth";
import { testEnv } from "../fixtures/env";
import { payWithTestCard, DECLINED_TEST_CARD } from "../helpers/stripe";
import { CHECKOUT_TEST_PRODUCT as PRODUCT, beginCheckout } from "../helpers/checkout";

/** Sums stock across all of a product's size variants via the same
 * anon-key, RLS-scoped read a real shopper's browser performs to render
 * sold-out states — no elevated credentials needed. */
async function totalStock(page: Page, productDbId: string): Promise<number> {
  return page.evaluate(
    async ({ url, key, productDbId }) => {
      const res = await fetch(
        `${url}/rest/v1/product_variants?product_id=eq.${productDbId}&select=stock`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const rows = (await res.json()) as { stock: number }[];
      return rows.reduce((sum, r) => sum + r.stock, 0);
    },
    { url: testEnv.supabaseUrl, key: testEnv.supabaseAnonKey, productDbId }
  );
}

test.use({ storageState: customerStorageState });

test.describe.serial("successful payment", () => {
  let stockBefore: number;

  test("completes a real Stripe test-mode payment and lands on the confirmation page", async ({
    page,
  }) => {
    stockBefore = await totalStock(page, PRODUCT.dbId);

    await beginCheckout(page);
    await payWithTestCard(page);
    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.getByRole("heading", { name: /order is confirmed/i })).toBeVisible();

    // OrderBlock only renders once fetchOrderBySessionId finds the order
    // with payment_status "paid" — i.e. once the signature-verified
    // webhook has actually landed and processed it. This IS the proof
    // that webhook verification worked, not just that Stripe accepted
    // the card.
    await expect(page.locator("article")).toBeVisible({ timeout: 15_000 });
  });

  test("clears the cart immediately on arrival at the confirmation page", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });

  test("shows the order, paid, in the customer's order history", async ({ page }) => {
    await page.goto("/account/orders");
    const article = page.locator("article").first();
    await expect(article).toBeVisible();
    await expect(article.getByText(PRODUCT.name)).toBeVisible();
    await expect(article.getByText(/paid/i)).toBeVisible();
  });

  test("syncs the same order into the admin orders view", async ({ browser }) => {
    const adminContext = await browser.newContext({ storageState: adminStorageState });
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin/orders");
    await adminPage.getByLabel("Search orders").fill(testEnv.customerEmail);

    // The list row is a collapsed summary (order #, customer, status,
    // total) — product-level detail is progressive disclosure behind it.
    const row = adminPage.getByRole("button", { name: /paid/i }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText("$240");

    await row.click();
    await expect(adminPage.getByText(PRODUCT.name).first()).toBeVisible();
    await adminContext.close();
  });

  test("decrements inventory by exactly the purchased quantity, once", async ({ page }) => {
    const stockAfter = await totalStock(page, PRODUCT.dbId);
    expect(stockAfter).toBe(stockBefore - 1);
  });
});

test.describe("declined payment", () => {
  test("a declined card leaves the order unpaid and the cart untouched", async ({ page }) => {
    await beginCheckout(page);
    await page.getByPlaceholder("1234 1234 1234 1234").fill(DECLINED_TEST_CARD.number);
    await page.getByPlaceholder("MM / YY").fill("12/34");
    await page.getByPlaceholder("CVC").fill("123");
    await page.getByPlaceholder("Full name on card").fill(DECLINED_TEST_CARD.name);
    await page.getByRole("button", { name: /^pay$/i }).click();

    // Stripe keeps the shopper on its own page with a decline message —
    // this must NOT reach /checkout/success.
    await expect(page.getByText(/declined/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();
  });
});

test.describe("cancelled payment", () => {
  test("backing out of Stripe returns to the cancelled page without charging", async ({
    page,
  }) => {
    await beginCheckout(page);
    // Not page.goBack(): that's plain browser history and lands back on
    // our own /checkout form, not Stripe's cancel_url — Stripe's hosted
    // page has its own "Back to <account>" link that actually triggers it.
    await page.getByRole("link", { name: /^back to/i }).click();
    await expect(page).toHaveURL(/\/checkout\/cancelled/);
    await expect(page.getByText(/no charge was made/i)).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();
  });
});
