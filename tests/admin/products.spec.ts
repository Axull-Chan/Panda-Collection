import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { adminStorageState } from "../helpers/auth";

const dir = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_IMAGE = path.join(dir, "../../public/images/check-trouser.jpg");
const INVALID_FILE = path.join(dir, "../fixtures/env.ts"); // a real, non-image file

test.use({ storageState: adminStorageState });

test.describe("product list — search and filters (real catalog, read-only)", () => {
  test("searches products by name", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill("Oxford Shirt");
    await expect(page.getByText("Oxford Shirt", { exact: true })).toBeVisible();
    await expect(page.getByText("Souvenir Blouson", { exact: true })).not.toBeVisible();
  });

  test("filters by status", async ({ page }) => {
    // The whole real catalog is published (confirmed via Supabase) and this
    // describe block runs before any test-owned draft/archived product
    // exists, so "published" should show the real catalog and the other
    // two statuses should each show the empty state.
    await page.goto("/admin/products");
    await page.getByLabel("Filter by status").selectOption("published");
    await expect(page.getByText("Oxford Shirt", { exact: true })).toBeVisible();

    await page.getByLabel("Filter by status").selectOption("draft");
    await expect(page.getByText(/no products match these filters/i)).toBeVisible();

    await page.getByLabel("Filter by status").selectOption("archived");
    await expect(page.getByText(/no products match these filters/i)).toBeVisible();
  });

  test("shows an empty state when no product matches", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill("no such product exists xyz123");
    await expect(page.getByText(/no products match these filters/i)).toBeVisible();
  });
});

test.describe.serial("product lifecycle (dedicated test product)", () => {
  const testName = `QA Test Product ${Date.now()}`;
  let editUrl = "";

  test("creates a new draft product", async ({ page }) => {
    await page.goto("/admin/products/new");
    await page.getByLabel("Product Name").fill(testName);
    await page.getByLabel("Price ($)").fill("99");
    await page.getByRole("button", { name: "Add Variant" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    editUrl = page.url();

    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill(testName);
    await expect(page.getByText(testName)).toBeVisible();
    // StatusBadge renders the raw status value, lowercase.
    await expect(page.getByText("draft", { exact: true })).toBeVisible();
  });

  test("requires a name and price before saving", async ({ page }) => {
    await page.goto("/admin/products/new");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/name and price are required/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/products\/new$/);
  });

  test("edits and persists a change", async ({ page }) => {
    await page.goto(editUrl);
    // Wait for the existing price to actually load before typing over it —
    // like a real admin would, and not racing the initial async fetch that
    // populates this field (it wins any race and overwrites a same-tick fill).
    await expect(page.getByLabel("Price ($)")).toHaveValue("99");
    await page.getByLabel("Price ($)").fill("120");
    // Still a draft at this point, so the submit button reads "Save"
    // (it only becomes "Save Changes" once published).
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Price ($)")).toHaveValue("120");
  });

  test("uploads a real image and rejects an invalid file type", async ({ page }) => {
    await page.goto(editUrl);
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles(INVALID_FILE);
    await expect(page.getByText(/only jpeg, png, and webp are supported/i)).toBeVisible();

    await fileInput.setInputFiles(SAMPLE_IMAGE);
    await expect(page.getByText("Primary")).toBeVisible({ timeout: 15_000 });
  });

  test("publishes, then unpublishes back to draft", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByRole("button", { name: "Save & Publish" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page.getByText("published", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Unpublish to Draft" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page.getByText("draft", { exact: true }).first()).toBeVisible();
  });

  test("archives and restores from the list page", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill(testName);
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("archived", { exact: true })).toBeVisible();

    // Default status filter is "all", so the now-archived row is still
    // showing — its row action has already flipped from Archive to Restore.
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("draft", { exact: true })).toBeVisible();
  });

  test("duplicates the product as a new draft", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill(testName);
    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByText(/duplicated/i)).toBeVisible();

    await page.getByLabel("Search products").fill(`${testName} (Copy)`);
    await expect(page.getByText(`${testName} (Copy)`)).toBeVisible();
  });

  test("bulk-deletes both the product and its duplicate (cleanup)", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/products");
    await page.getByLabel("Search products").fill(testName);

    // The header checkbox renders unconditionally, even before the async
    // product fetch resolves — clicking it before the search has actually
    // filtered the list selects against a stale (empty or unfiltered) set.
    // Waiting for both rows to actually be on screen first is what makes
    // "Select all" select the right two.
    await expect(page.getByText(testName, { exact: true })).toBeVisible();
    await expect(page.getByText(`${testName} (Copy)`, { exact: true })).toBeVisible();

    // Both the original (now back in Draft) and its "(Copy)" match this
    // search and are drafts, so Delete Drafts is enabled for the pair.
    // Not .check(): its "did the state actually flip" assertion is
    // unreliable here; the later empty-state assertion is what actually
    // proves the selection (and deletion) worked.
    await page.locator('input[aria-label="Select all"]').click();
    await page.getByRole("button", { name: "Delete Drafts" }).click();

    await expect(page.getByText(/no products match these filters/i)).toBeVisible();
  });
});
