import { expect, type Page } from "@playwright/test";

/** Real, currently-published catalog product used across checkout/payment tests. */
export const CHECKOUT_TEST_PRODUCT = {
  slug: "oxford-shirt",
  name: "Oxford Shirt",
  price: 240,
  // Real DB id (queried from Supabase) — lets tests sum stock across all of
  // its size variants without needing to know which one gets auto-selected.
  dbId: "5d02329d-f619-44e0-a480-352eb8872f88",
};

export const VALID_TEST_ADDRESS = {
  fullName: "QA Customer",
  line1: "1 Test Street",
  city: "Lisbon",
  postal: "1200-385",
  country: "Portugal",
};

export async function addToCart(page: Page, slug: string = CHECKOUT_TEST_PRODUCT.slug) {
  await page.goto(`/product/${slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
}

export async function fillAddress(
  page: Page,
  address: Partial<typeof VALID_TEST_ADDRESS> = VALID_TEST_ADDRESS
) {
  if (address.fullName !== undefined) await page.getByLabel("Full Name").fill(address.fullName);
  if (address.line1 !== undefined) await page.getByLabel("Address Line 1").fill(address.line1);
  if (address.city !== undefined) await page.getByLabel("City").fill(address.city);
  if (address.postal !== undefined) await page.getByLabel("Postal Code").fill(address.postal);
  if (address.country !== undefined) await page.getByLabel("Country").fill(address.country);
}

/**
 * CheckoutPage refuses to submit while the live catalog hasn't replaced the
 * bundled fallback yet (source !== "database") — a real, intentional guard
 * against checking out against stale data, surfaced as "The catalog is
 * still loading — please try again in a moment." A click landing in that
 * brief window never reaches the server, so retrying is safe: at most one
 * attempt ever gets far enough to create a real order.
 */
export async function submitCheckoutForm(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: /continue to payment/i }).click();
    await expect(page.getByText(/catalog is still loading/i)).not.toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
}

/** Full happy-path flow up to the Stripe redirect: add to cart, fill address, submit. */
export async function beginCheckout(page: Page) {
  await addToCart(page);
  await page.goto("/checkout");
  await fillAddress(page);
  await submitCheckoutForm(page);
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
}
