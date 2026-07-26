import { test, expect, devices } from "@playwright/test";
import { adminStorageState } from "../helpers/auth";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

async function hasHorizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`${name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport });

    for (const path of ["/", "/collections", "/product/oxford-shirt", "/cart"]) {
      test(`no horizontal overflow on ${path}`, async ({ page }) => {
        await page.goto(path);
        expect(await hasHorizontalOverflow(page)).toBe(false);
      });
    }

    test("primary navigation adapts correctly", async ({ page }) => {
      await page.goto("/");
      const desktopNav = page.getByRole("navigation", { name: "Primary" });
      const hamburger = page.getByRole("button", { name: "Open menu" });

      if (name === "desktop") {
        await expect(desktopNav).toBeVisible();
        await expect(hamburger).not.toBeVisible();
      } else {
        await expect(hamburger).toBeVisible();
        await expect(desktopNav).not.toBeVisible();

        await hamburger.click();
        await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
        await page.getByRole("button", { name: "Close menu" }).click();
      }
    });

    test("product image scales within its container, no overflow", async ({ page }) => {
      await page.goto("/product/oxford-shirt");
      const image = page.locator("main img").first();
      const box = await image.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(viewport.width);
    });
  });
}

test.describe("admin dashboard responsiveness", () => {
  test.use({ storageState: adminStorageState });

  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`no horizontal overflow on the admin products list (${name})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/admin/products");
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("real device emulation", () => {
  test("iPhone 14 renders the homepage without overflow", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPhone 14"] });
    const page = await context.newPage();
    await page.goto("/");
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await context.close();
  });

  test("iPad renders the collections grid without overflow", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPad (gen 7)"] });
    const page = await context.newPage();
    await page.goto("/collections");
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await context.close();
  });
});
