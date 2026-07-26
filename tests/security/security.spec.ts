import { test, expect, type Page } from "@playwright/test";
import { customerStorageState } from "../helpers/auth";
import { testEnv } from "../fixtures/env";
import { getAuthToken, getStoredSession } from "../helpers/supabase";

// Route-level protection (RequireAuth/RequireAdmin redirecting signed-out
// and non-admin visitors) is already covered for real in
// tests/fixtures/setup.spec.ts and tests/authentication/authorization.spec.ts
// — this file focuses on what those don't: RLS enforcement at the database
// layer itself (bypassing the UI entirely, the way a malicious client
// would) and the newsletter's own abuse-prevention mechanism.

async function restQuery(
  page: Page,
  path: string,
  init: { method?: string; body?: unknown } = {}
) {
  const token = (await getAuthToken(page)) || testEnv.supabaseAnonKey;
  return page.evaluate(
    async ({ url, key, token, path, method, body }) => {
      const res = await fetch(`${url}/rest/v1/${path}`, {
        method: method ?? "GET",
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(method && method !== "GET" ? { Prefer: "return=representation" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    },
    { url: testEnv.supabaseUrl, key: testEnv.supabaseAnonKey, token, path, method: init.method, body: init.body }
  );
}

test.describe("RLS enforcement (signed in as the customer, not admin)", () => {
  test.use({ storageState: customerStorageState });

  test("cannot write to products — admin-only by policy", async ({ page }) => {
    await page.goto("/"); // localStorage is inaccessible from the initial blank page
    const before = await restQuery(page, "products?slug=eq.oxford-shirt&select=name");
    const originalName = before.body[0].name;

    await restQuery(page, "products?slug=eq.oxford-shirt", {
      method: "PATCH",
      body: { name: "Tampered By Customer" },
    });

    const after = await restQuery(page, "products?slug=eq.oxford-shirt&select=name");
    expect(after.body[0].name).toBe(originalName);
  });

  test("cannot read another user's profile", async ({ page }) => {
    await page.goto("/");
    // The admin QA account's profile id — a real row that exists, just not
    // this session's own.
    const adminProfileQuery = await restQuery(
      page,
      `profiles?email=eq.${encodeURIComponent(testEnv.adminEmail)}&select=id,email`
    );
    expect(adminProfileQuery.body).toEqual([]); // RLS hides it, not an error
  });

  test("cannot read another user's orders", async ({ page }) => {
    await page.goto("/");
    const session = await getStoredSession(page);
    const customerId = session?.user.id;
    const allVisibleOrders = await restQuery(page, "orders?select=user_id");
    const belongsToSomeoneElse = (allVisibleOrders.body as { user_id: string }[]).some(
      (o) => o.user_id !== customerId
    );
    expect(belongsToSomeoneElse).toBe(false);
  });
});

test.describe("newsletter abuse prevention", () => {
  test("rate-limits repeated signups from the same client", async ({ page }) => {
    await page.goto("/");

    // The IP-based limit is 5/hour; a repeat run within the same hour may
    // already be partway through its quota, so this keeps submitting
    // (bounded) until the rate-limited message actually appears, rather
    // than assuming a clean start.
    // Scoped to the footer (contentinfo landmark): the homepage also embeds
    // its own NewsletterSection in <main>, so the plain label is ambiguous
    // there. The footer instance is the one present site-wide.
    const footer = page.getByRole("contentinfo");
    let rateLimited = false;
    for (let i = 0; i < 6 && !rateLimited; i++) {
      await page.reload();
      await footer
        .getByLabel("Email address")
        .fill(`qa-newsletter-test-${Date.now()}-${i}@example.com`);
      await footer.getByRole("button", { name: /subscribe/i }).click();
      const outcome = footer
        .getByText(/too many attempts/i)
        .or(footer.getByText(/you're on the list/i));
      await expect(outcome).toBeVisible({ timeout: 10_000 });
      rateLimited = await footer.getByText(/too many attempts/i).isVisible();
    }
    expect(rateLimited).toBe(true);
  });
});
