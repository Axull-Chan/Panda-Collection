import { test, expect } from "@playwright/test";
import { adminStorageState, customerStorageState } from "../helpers/auth";

// A dedicated, disposable product with one out-of-stock and one low-stock
// variant — created and torn down entirely through the admin UI, so real
// catalog stock is never touched.
const testName = `QA Inventory Test ${Date.now()}`;
let productSlug = "";

test.describe.serial("inventory management", () => {
  test.use({ storageState: adminStorageState });

  test("admin creates a published product with an out-of-stock and a low-stock variant", async ({
    page,
  }) => {
    await page.goto("/admin/products/new");
    await page.getByLabel("Product Name").fill(testName);
    await page.getByLabel("Price ($)").fill("50");

    // exact: true — "Size" is otherwise a substring match of "Edition Size".
    await page.getByRole("button", { name: "Add Variant" }).click();
    await page.getByLabel("Size", { exact: true }).selectOption("S");
    await page.getByLabel("Stock").fill("0");

    await page.getByRole("button", { name: "Add Variant" }).click();
    const stockInputs = page.getByLabel("Stock");
    await page.getByLabel("Size", { exact: true }).nth(1).selectOption("M");
    await stockInputs.nth(1).fill("2"); // <= LOW_STOCK_VARIANT_THRESHOLD (4)

    await page.getByRole("button", { name: "Save & Publish" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page.getByText("published", { exact: true })).toBeVisible();

    const url = new URL(page.url());
    const idMatch = url.pathname.match(/\/admin\/products\/([0-9a-f-]{36})/);
    expect(idMatch).toBeTruthy();
  });

  test("shows correct low/out-of-stock states and filters in the inventory page", async ({
    page,
  }) => {
    await page.goto("/admin/inventory");
    await page.getByLabel("Search inventory").fill(testName);
    await expect(page.getByText("Out of stock", { exact: true })).toBeVisible();
    await expect(page.getByText("Low", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Low Stock" }).click();
    await expect(page.getByText(testName).first()).toBeVisible();
    await expect(page.getByText("Out of stock", { exact: true })).not.toBeVisible();

    await page.getByRole("button", { name: "Out of Stock" }).click();
    await expect(page.getByText(testName).first()).toBeVisible();
    await expect(page.getByText("Low", { exact: true })).not.toBeVisible();
  });

  test("adjusts stock and it persists", async ({ page }) => {
    await page.goto("/admin/inventory");
    await page.getByLabel("Search inventory").fill(testName);

    // Scoped to the "M" variant specifically (not .first(), since row
    // order between the two variants isn't guaranteed) — and deliberately
    // not the "S" variant, which the out-of-stock-prevention test below
    // depends on staying at exactly 0.
    const mRow = page
      .locator("div")
      .filter({ has: page.getByRole("checkbox", { name: `Select ${testName} One Colour / M` }) })
      .last();
    await mRow.getByRole("button", { name: "Increase stock" }).click();
    await expect(mRow.getByLabel("Stock quantity")).toHaveValue("3");

    await page.reload();
    await page.getByLabel("Search inventory").fill(testName);
    const mRowAfterReload = page
      .locator("div")
      .filter({ has: page.getByRole("checkbox", { name: `Select ${testName} One Colour / M` }) })
      .last();
    await expect(mRowAfterReload.getByLabel("Stock quantity")).toHaveValue("3");
  });
});

test.describe.serial("out-of-stock prevention (customer-facing)", () => {
  test.use({ storageState: customerStorageState });

  test("a sold-out size can't be selected or added to cart, but a low-stock size can", async ({
    page,
  }) => {
    // Re-derive the slug: the product was created in the admin-only
    // describe block above (separate storageState), so it isn't shared
    // via a closure — look it up by name via the public collection search.
    await page.goto("/collections");
    await page.getByLabel("Search garments").fill(testName);
    // Not getByText: this product has no image, so its card's Image
    // fallback also renders an sr-only span carrying the same alt text
    // (the product name) — getByRole("heading") is unambiguous.
    await page.getByRole("heading", { name: testName }).click();
    productSlug = new URL(page.url()).pathname.replace("/product/", "");

    const soldOutSize = page.getByRole("button", { name: "S", exact: true });
    await expect(soldOutSize).toBeDisabled();

    const lowStockSize = page.getByRole("button", { name: "M", exact: true });
    await expect(lowStockSize).toBeEnabled();
    await lowStockSize.click();
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page.getByRole("button", { name: /added to cart/i })).toBeVisible();
  });

  test("shows the branded fallback instead of a broken image icon (no image uploaded)", async ({
    page,
  }) => {
    await page.goto(`/product/${productSlug}`);
    // Image renders src="" for a product with zero images, so status
    // starts (and stays) "error" — no <img> tag is ever created for it,
    // just the ImageOff fallback glyph. A real broken-icon regression
    // would instead show a native <img> with a failed src.
    const mainImage = page.locator("main img").first();
    await expect(mainImage).toHaveCount(0);
  });
});

test.describe("cleanup", () => {
  test.use({ storageState: adminStorageState });

  test("deletes the test product", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill(testName);
    // Must be a draft for Delete Drafts to apply — unpublish first.
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("draft", { exact: true })).toBeVisible();

    await page.locator('input[aria-label="Select all"]').click();
    await page.getByRole("button", { name: "Delete Drafts" }).click();
    await expect(page.getByText(/no products match these filters/i)).toBeVisible();
  });
});
