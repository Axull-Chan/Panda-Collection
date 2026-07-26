import { test, expect } from "@playwright/test";
import { adminStorageState } from "../helpers/auth";

test.use({ storageState: adminStorageState });

test.describe("admin coupons — list", () => {
  test("searches coupons by code", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByLabel("Search coupons").fill("QA-PERCENT10");
    await expect(page.getByText("QA-PERCENT10", { exact: true })).toBeVisible();
    await expect(page.getByText("QA-FIXED20", { exact: true })).not.toBeVisible();
  });

  test("shows an empty state for a search with no matches", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByLabel("Search coupons").fill("no-such-coupon-xyz123");
    await expect(page.getByText(/no coupons match/i)).toBeVisible();
  });

  test("filters by status", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByLabel("Search coupons").fill("QA-INACTIVE");
    await expect(page.getByText("QA-INACTIVE", { exact: true })).toBeVisible();
    await page.getByLabel("Filter by status").selectOption("active");
    await expect(page.getByText(/no coupons match/i)).toBeVisible();
  });
});

test.describe.serial("coupon lifecycle (dedicated test coupon)", () => {
  const code = `QATESTCOUPON${Date.now()}`;

  test("creates a new coupon", async ({ page }) => {
    await page.goto("/admin/coupons/new");
    await page.getByLabel("Coupon Code").fill(code);
    await page.getByLabel("Discount (%)").fill("15");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/coupons\/[0-9a-f-]{36}$/);
    // usedCount starts at 0 with no max_uses on a freshly created coupon.
    await expect(page.getByText(/^0 used/)).toBeVisible();
  });

  test("requires a code and a positive discount value", async ({ page }) => {
    await page.goto("/admin/coupons/new");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/discount value greater than zero/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/coupons\/new$/);
  });

  test("edits and persists a change", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByLabel("Search coupons").fill(code);
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    await page.getByText(code, { exact: true }).click();

    await expect(page.getByLabel("Discount (%)")).toHaveValue("15");
    await page.getByLabel("Discount (%)").fill("25");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Discount (%)")).toHaveValue("25");
  });

  test("deactivates and reactivates from the editor", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByLabel("Search coupons").fill(code);
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    await page.getByText(code, { exact: true }).click();

    await page.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText("inactive", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Activate" }).click();
    await expect(page.getByText("active", { exact: true })).toBeVisible();
  });

  test("deactivating from the list toggles status without opening the editor", async ({
    page,
  }) => {
    await page.goto("/admin/coupons");
    await page.getByLabel("Search coupons").fill(code);
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText("inactive", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Activate" }).click();
    await expect(page.getByText("active", { exact: true })).toBeVisible();
  });

  test("deletes the coupon (cleanup)", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/coupons");
    await page.getByLabel("Search coupons").fill(code);
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(/no coupons match/i)).toBeVisible();
  });
});
