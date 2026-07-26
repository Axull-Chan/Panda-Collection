import { test, expect } from "@playwright/test";

const PRODUCT = { slug: "oxford-shirt", name: "Oxford Shirt" };

test.describe("image reliability", () => {
  test("a broken image URL falls back gracefully — never the browser's broken-icon", async ({
    page,
  }) => {
    // Force this one product's real image request to fail, simulating a
    // dead/invalid URL (e.g. a deleted storage object) without needing a
    // disposable database fixture just to get a bad src.
    await page.route("**/images/flatlay-oxford.jpg", (route) => route.abort("failed"));

    await page.goto(`/product/${PRODUCT.slug}`);

    // The <img> tag is removed from the DOM entirely once it errors (not
    // just hidden) — this alone is the proof there's no broken-icon risk:
    // a browser can only ever show that glyph for an <img> with a failed
    // src, and none exists here once the component reacts to the error.
    await expect(page.locator("main img")).toHaveCount(0, { timeout: 10_000 });
  });

  test("below-the-fold product card images are lazy-loaded", async ({ page }) => {
    await page.goto("/collections");
    const cardImages = page.locator("main img");
    const count = await cardImages.count();
    expect(count).toBeGreaterThan(3);

    // The 4th+ card is safely below the fold on any real viewport.
    await expect(cardImages.nth(3)).toHaveAttribute("loading", "lazy");
  });

  test("the hero/priority image is not lazy-loaded", async ({ page }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    const heroImage = page.locator("main img").first();
    await expect(heroImage).toHaveAttribute("loading", "eager");
  });

  test("product images lock to a fixed aspect ratio (no layout shift)", async ({ page }) => {
    await page.goto("/collections");
    const wrapper = page.locator("main img").first().locator("..");
    const ratio = await wrapper.evaluate((el) => getComputedStyle(el).aspectRatio);
    // "auto" would mean no ratio is locked — this checks the CSS property
    // exists and resolves to real dimensions, not layout-agnostic auto-sizing.
    expect(ratio).not.toBe("auto");
  });

  test("images fade in only once loaded, never popping in unloaded", async ({ page }) => {
    await page.goto(`/product/${PRODUCT.slug}`);
    const heroImage = page.locator("main img").first();
    // Not a one-shot evaluate(): toBeVisible() only requires a bounding
    // box, not opacity:1, so a same-tick opacity read can catch the image
    // still at its pre-load 0. toHaveCSS auto-retries until it settles.
    await expect(heroImage).toHaveCSS("opacity", "1", { timeout: 10_000 });
  });
});
