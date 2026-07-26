import { test, expect } from "@playwright/test";
import { adminStorageState } from "../helpers/auth";

test.use({ storageState: adminStorageState });

test.describe("admin dashboard", () => {
  test("loads with stat tiles and recent activity", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

    // Scoped to <main>: "Products" and "Customers" are also sidebar nav
    // links, which would otherwise make this locator ambiguous.
    const main = page.locator("main");
    for (const label of ["Products", "Published", "Drafts", "Archived", "Customers"]) {
      await expect(main.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Recent Orders" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Product Updates" })).toBeVisible();
  });

  test("navigates to each admin section from the sidebar", async ({ page }) => {
    await page.goto("/admin");
    for (const [label, path] of [
      ["Products", "/admin/products"],
      ["Orders", "/admin/orders"],
      ["Inventory", "/admin/inventory"],
      ["Customers", "/admin/customers"],
    ] as const) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"));
    }
  });
});
