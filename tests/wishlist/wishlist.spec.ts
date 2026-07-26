import { test, expect } from "@playwright/test";
import { customerStorageState } from "../helpers/auth";

const PRODUCT = { slug: "oxford-shirt", name: "Oxford Shirt" };

test.describe("signed out", () => {
  test("tapping the heart on a product page sends the visitor to sign in first", async ({
    page,
  }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    await page.getByRole("button", { name: /save to wishlist/i }).click();
    await expect(page).toHaveURL(/\/account\/sign-in/);
  });
});

test.describe("signed in", () => {
  test.use({ storageState: customerStorageState });

  // The wishlist is server-synced (Supabase wishlist_items), not
  // client-local like the cart, so it persists across test runs unless
  // each test cleans up after itself. This resets the shared QA customer
  // account back to empty regardless of how the test above it went.
  //
  // WishlistPage renders its "grid" branch (not a loading state) while the
  // fetch is still in flight, so a plain .count() right after goto() can
  // read 0 before the real data arrives. Waiting for a definitive loaded
  // signal (empty-state text, or at least one Remove button) first avoids
  // skipping cleanup and leaking a saved item into the next test.
  test.afterEach(async ({ page }) => {
    await page.goto("/account/wishlist");
    const emptyState = page.getByText(/nothing saved yet/i);
    const removeButtons = page.getByRole("button", { name: "Remove" });
    await expect(emptyState.or(removeButtons.first())).toBeVisible();

    let count = await removeButtons.count();
    while (count > 0) {
      await removeButtons.first().click();
      count -= 1;
      if (count > 0) {
        await expect(removeButtons).toHaveCount(count);
      } else {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test("adds a product from the detail page and shows it on the wishlist page", async ({
    page,
  }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    await page.getByRole("button", { name: /save to wishlist/i }).click();
    await expect(page.getByRole("button", { name: /saved to wishlist/i })).toBeVisible();

    await page.goto("/account/wishlist");
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();
    await expect(page.getByText("1 piece saved")).toBeVisible();
  });

  test("removing on the wishlist page clears the empty state and un-saves the product", async ({
    page,
  }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    await page.getByRole("button", { name: /save to wishlist/i }).click();

    await page.goto("/account/wishlist");
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/nothing saved yet/i)).toBeVisible();

    // Sync back to the product page: the heart should have reverted too.
    await page.goto(`/product/${PRODUCT.slug}`);
    await expect(page.getByRole("button", { name: /save to wishlist/i })).toBeVisible();
  });

  test("stays in sync between the product page and the wishlist page", async ({ page }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    await page.getByRole("button", { name: /save to wishlist/i }).click();
    await expect(page.getByRole("button", { name: /saved to wishlist/i })).toBeVisible();

    await page.goto("/account/wishlist");
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();

    // Toggling the heart again from the product page (not the wishlist
    // page's own Remove button) should also be reflected immediately.
    await page.goto(`/product/${PRODUCT.slug}`);
    await page.getByRole("button", { name: /saved to wishlist/i }).click();
    await expect(page.getByRole("button", { name: /save to wishlist/i })).toBeVisible();

    await page.goto("/account/wishlist");
    await expect(page.getByText(/nothing saved yet/i)).toBeVisible();
  });

  test("persists across a reload", async ({ page }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    await page.getByRole("button", { name: /save to wishlist/i }).click();

    await page.goto("/account/wishlist");
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();
  });

  test("shows a profile summary that links to the full wishlist", async ({ page }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    await page.getByRole("button", { name: /save to wishlist/i }).click();

    await page.goto("/account");
    await expect(page.getByText("1 piece saved")).toBeVisible();
    await page.getByRole("link", { name: /view wishlist/i }).click();
    await expect(page).toHaveURL(/\/account\/wishlist/);
    await expect(page.getByText(PRODUCT.name, { exact: true })).toBeVisible();
  });
});
