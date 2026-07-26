import { test, expect } from "@playwright/test";
import { customerStorageState } from "../helpers/auth";
import { testEnv } from "../fixtures/env";
import {
  CHECKOUT_TEST_PRODUCT as PRODUCT,
  VALID_TEST_ADDRESS as VALID_ADDRESS,
  addToCart,
  fillAddress,
  submitCheckoutForm,
} from "../helpers/checkout";
import { getAuthToken } from "../helpers/supabase";

test.use({ storageState: customerStorageState });

test.describe("checkout page", () => {
  test("shows the empty-cart state when there's nothing to check out", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /explore collection/i })).toBeVisible();
  });

  test("order summary reflects the real cart contents and total", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
    await expect(page.getByText(/size .+ · qty 1/i)).toBeVisible();
    await expect(page.getByText(`$${PRODUCT.price}`).first()).toBeVisible();
  });

  test("blocks submission with an incomplete shipping address", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    // Leave every address field blank.
    await page.getByRole("button", { name: /continue to payment/i }).click();
    await expect(page.getByText(/please fill in your shipping address/i)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("survives a reload mid-checkout with the cart still intact", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillAddress(page, VALID_ADDRESS);

    await page.reload();
    // Cart contents (server/localStorage-backed) persist; the address form
    // itself is local component state and is expected to reset — the bar
    // here is that the page recovers cleanly, not that typed input survives.
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
    await expect(page.getByLabel("Address Line 1")).toHaveValue("");
  });

  test("landing on the cancelled page leaves the cart untouched", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout/cancelled?session_id=cs_test_does_not_matter");
    await expect(page.getByRole("heading", { name: /payment cancelled/i })).toBeVisible();
    await expect(page.getByText(/no charge was made/i)).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();
  });

  test("begins checkout and reaches Stripe's hosted payment page", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillAddress(page, VALID_ADDRESS);
    await submitCheckoutForm(page);
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  });

  test("a rapid duplicate checkout request reuses the same Stripe session", async ({ page }) => {
    // The submit button disables itself while busy, so a genuine double
    // *click* can't reach the server twice — the guard this proves exists
    // for a fast page refresh or a second open tab instead. Invoking the
    // Edge Function directly (with the customer's own real session, same
    // as the app does) is the only way to exercise that race deterministically.
    await addToCart(page);
    const token = await getAuthToken(page);
    const urls = await page.evaluate(
      async ({ supabaseUrl, anonKey, token, address, origin }) => {
        const cartRaw = localStorage.getItem("anita-cart");
        const lines = cartRaw ? JSON.parse(cartRaw) : [];

        const callOnce = async () => {
          const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: anonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ lines, address, origin }),
          });
          return (await res.json()) as { url?: string };
        };

        const first = await callOnce();
        const second = await callOnce();
        return [first.url, second.url];
      },
      {
        supabaseUrl: testEnv.supabaseUrl,
        anonKey: testEnv.supabaseAnonKey,
        token,
        address: {
          line1: VALID_ADDRESS.line1,
          city: VALID_ADDRESS.city,
          postal_code: VALID_ADDRESS.postal,
          country: VALID_ADDRESS.country,
        },
        origin: "http://localhost:5173",
      }
    );

    expect(urls[0]).toBeTruthy();
    expect(urls[1]).toBe(urls[0]);
  });
});

// "Rate-limit interaction" is intentionally not re-verified live here.
// CHECKOUT_MAX_ATTEMPTS is a real, shared 5-per-5-minute budget on this
// Supabase project's checkout bucket — the same budget the Stripe payment
// suite (tests/payments) needs for its own real checkout sessions. Phase 2
// already live-tested the 429 path exhaustively (rapid-fire requests,
// friendly message, cooldown recovery — see the Phase 2 report). Forcing
// it again here would mean either burning that shared budget on every
// suite run, or manipulating rate_limit_counters with a service-role key
// that a regular signed-in customer legitimately can't and shouldn't have —
// widening the credentials this suite carries for a mechanism already
// proven live. CheckoutPage's error-display path for a server rejection
// (setError(message) from the same `if (fnError || !data?.url)` branch a
// 429 also hits) is exercised for real by every other server-error case a
// live run naturally produces.
