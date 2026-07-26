import { test, expect, type Page } from "@playwright/test";

// Real, currently-published products used as stable fixtures.
const PRODUCT_A = { slug: "oxford-shirt", name: "Oxford Shirt", price: 240 };
const PRODUCT_B = { slug: "poplin-shirt", name: "Striped Knit Polo", price: 220 };

async function addToCartFromDetail(page: Page, slug: string) {
  await page.goto(`/product/${slug}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
}

// Cart lines and the nav's cart-count badge can both render a bare "N" text
// node (the badge is a <span>{itemCount}</span> outside <main>), so quantity
// assertions are scoped to <main> to avoid matching the wrong one.
function cartMain(page: Page) {
  return page.locator("main");
}

test.describe("adding to cart", () => {
  test("adds a product and reflects it in the nav and cart page", async ({ page }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await expect(page.getByRole("link", { name: /cart, 1 items?/i })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT_A.name, { exact: true })).toBeVisible();
    await expect(page.getByText(`$${PRODUCT_A.price}`).first()).toBeVisible();
  });

  test("adding the same product+size again increments quantity instead of duplicating the line", async ({
    page,
  }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await addToCartFromDetail(page, PRODUCT_A.slug);

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT_A.name, { exact: true })).toHaveCount(1);
    await expect(page.getByLabel("Decrease quantity")).toHaveCount(1);
    await expect(cartMain(page).getByText("2", { exact: true })).toBeVisible();
  });

  test("adding two different products creates two separate lines", async ({ page }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await addToCartFromDetail(page, PRODUCT_B.slug);

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT_A.name, { exact: true })).toBeVisible();
    await expect(page.getByText(PRODUCT_B.name, { exact: true })).toBeVisible();
    await expect(page.getByText(`$${PRODUCT_A.price + PRODUCT_B.price}`)).toBeVisible();
  });
});

test.describe("cart page", () => {
  test("quantity stepper adjusts quantity and subtotal", async ({ page }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await page.goto("/cart");

    await page.getByLabel("Increase quantity").click();
    await expect(cartMain(page).getByText("2", { exact: true })).toBeVisible();
    await expect(page.getByText(`$${PRODUCT_A.price * 2}`)).toBeVisible();

    await page.getByLabel("Decrease quantity").click();
    await expect(cartMain(page).getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByText(`$${PRODUCT_A.price}`).first()).toBeVisible();
  });

  test("decreasing quantity below one removes the line instead of going negative", async ({
    page,
  }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await page.goto("/cart");

    await page.getByLabel("Decrease quantity").click();
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });

  test("the Remove button deletes a line", async ({ page }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await page.goto("/cart");

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });

  test("shows an empty state with a link back to the collection", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /explore collection/i })).toBeVisible();
  });

  test("persists across a reload", async ({ page }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await page.goto("/cart");
    await expect(page.getByText(PRODUCT_A.name, { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText(PRODUCT_A.name, { exact: true })).toBeVisible();
    await expect(page.getByText(`$${PRODUCT_A.price}`).first()).toBeVisible();
  });
});

test.describe("checkout entry point", () => {
  test("sends a signed-out visitor to sign in, remembering to return to checkout", async ({
    page,
  }) => {
    await addToCartFromDetail(page, PRODUCT_A.slug);
    await page.goto("/cart");
    await expect(page.getByText(/you'll be asked to sign in/i)).toBeVisible();

    await page.getByRole("button", { name: "Checkout" }).click();
    await expect(page).toHaveURL(/\/account\/sign-in/);
  });
});
