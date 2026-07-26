import { test, expect } from "@playwright/test";
import { adminStorageState } from "../helpers/auth";
import { testEnv } from "../fixtures/env";

test.use({ storageState: adminStorageState });

test.describe("admin customers", () => {
  test("lists the real customer and admin QA accounts", async ({ page }) => {
    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: "Customers", level: 1 })).toBeVisible();
    await expect(page.getByText(testEnv.customerEmail)).toBeVisible();
    await expect(page.getByText(testEnv.adminEmail)).toBeVisible();
    // At least one admin-role row is labeled — there may be more than one
    // admin account in the house list, this isn't asserting an exact count.
    await expect(page.getByText("Admin", { exact: true }).first()).toBeVisible();
  });

  test("searches by email", async ({ page }) => {
    await page.goto("/admin/customers");
    await page.getByLabel("Search customers").fill(testEnv.customerEmail);
    await expect(page.getByText(testEnv.customerEmail)).toBeVisible();
    await expect(page.getByText(testEnv.adminEmail)).not.toBeVisible();
  });

  test("shows an empty state when no customer matches", async ({ page }) => {
    await page.goto("/admin/customers");
    await page.getByLabel("Search customers").fill("no-such-customer-xyz@example.com");
    await expect(page.getByText(/no customers match/i)).toBeVisible();
  });
});
