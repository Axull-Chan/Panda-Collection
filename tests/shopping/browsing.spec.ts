import { test, expect } from "@playwright/test";

// Real, currently-live catalog facts (queried from Supabase), used as
// stable fixtures rather than hard-coding assumptions about the seed data.
const CHEAPEST_PRODUCT = "Striped Knit Polo"; // $220
const PRICIEST_PRODUCT = "Souvenir Blouson"; // $890
const UNIQUE_SEARCH_TERM = "Oxford";
const UNIQUE_SEARCH_MATCH = "Oxford Shirt";
const KNOWN_COATS = [
  "Cropped Bomber Jacket",
  "Suede Chore Jacket",
  "Gabardine Trench Coat",
  "Souvenir Blouson",
];

test.describe("homepage", () => {
  test("loads with a hero and navigable featured products", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const firstProductLink = page.locator('a[href^="/product/"]').first();
    await firstProductLink.click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("collections page", () => {
  test("lists the published catalog by default", async ({ page }) => {
    await page.goto("/collections");
    await expect(page.getByText(/\d+ pieces?/)).toBeVisible();
    await expect(page.getByText(CHEAPEST_PRODUCT)).toBeVisible();
    await expect(page.getByText(PRICIEST_PRODUCT)).toBeVisible();
  });

  test("filters by category", async ({ page }) => {
    await page.goto("/collections");
    await page.getByRole("button", { name: "Coats", exact: true }).click();
    await expect(page.getByRole("button", { name: "Coats", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    for (const name of KNOWN_COATS) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    // A product from a different category should have dropped out of the grid.
    await expect(page.getByText(UNIQUE_SEARCH_MATCH, { exact: true })).not.toBeVisible();
  });

  test("searches by product name", async ({ page }) => {
    await page.goto("/collections");
    await page.getByLabel("Search garments").fill(UNIQUE_SEARCH_TERM);
    await expect(page.getByText(UNIQUE_SEARCH_MATCH, { exact: true })).toBeVisible();
    await expect(page.getByText("1 piece")).toBeVisible();
  });

  test("shows an empty state for a search with no matches", async ({ page }) => {
    await page.goto("/collections");
    await page.getByLabel("Search garments").fill("no garment named this exists xyz123");
    await expect(page.getByText(/no garments match your search/i)).toBeVisible();
    await expect(page.getByText("0 pieces")).toBeVisible();
  });

  test("sorts by price, low to high and high to low", async ({ page }) => {
    await page.goto("/collections");
    const firstProductLink = page.locator('a[href^="/product/"]').first();

    await page.getByLabel("Sort products").selectOption("PRICE_LOW");
    await expect(firstProductLink.getByText(CHEAPEST_PRODUCT)).toBeVisible();

    await page.getByLabel("Sort products").selectOption("PRICE_HIGH");
    await expect(firstProductLink.getByText(PRICIEST_PRODUCT)).toBeVisible();
  });

  test("combines a category filter with search", async ({ page }) => {
    await page.goto("/collections");
    await page.getByRole("button", { name: "Coats", exact: true }).click();
    await page.getByLabel("Search garments").fill("Souvenir");
    await expect(page.getByText(PRICIEST_PRODUCT, { exact: true })).toBeVisible();
    await expect(page.getByText("1 piece")).toBeVisible();
  });
});

test.describe("product detail page", () => {
  test("shows full product information and links back from a grid click", async ({ page }) => {
    await page.goto("/collections");
    await page.getByText(UNIQUE_SEARCH_MATCH, { exact: true }).click();
    await expect(page).toHaveURL(/\/product\/oxford-shirt/);
    await expect(page.getByRole("heading", { name: UNIQUE_SEARCH_MATCH })).toBeVisible();
    await expect(page.getByText("$240")).toBeVisible();
    await expect(page.getByRole("button", { name: /add to cart/i })).toBeVisible();
  });

  test("shows a not-found state for an unknown slug", async ({ page }) => {
    await page.goto("/product/this-slug-does-not-exist-anywhere");
    await expect(page.getByText(/garment not found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /back to collections/i })).toBeVisible();
  });
});

test.describe("image loading", () => {
  test("collection grid images load without broken icons and carry alt text", async ({ page }) => {
    await page.goto("/collections");
    const images = page.locator("main img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    // Sample the first several rather than every image on the page — this
    // is a loading-reliability check, not an exhaustive per-image audit.
    const sampleSize = Math.min(count, 6);
    for (let i = 0; i < sampleSize; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute("alt", /.+/);
      await expect(async () => {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }).toPass({ timeout: 10_000 });
    }
  });
});
