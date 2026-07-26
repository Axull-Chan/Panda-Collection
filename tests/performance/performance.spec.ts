import { test, expect, type Page } from "@playwright/test";
import { customerStorageState, adminStorageState } from "../helpers/auth";

function trackErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("requestfailed", (req) => {
    // ERR_ABORTED specifically (not other failures) is expected here: the
    // app runs under <StrictMode>, which deliberately mounts every
    // component twice in development only — the first mount's in-flight
    // requests get superseded/cancelled when it unmounts, and the second
    // mount's identical requests complete normally. This never happens in
    // a production build (StrictMode's double-invoke is dev-only), so it's
    // not a real failed-request regression, just a dev-mode artifact.
    if (req.failure()?.errorText === "net::ERR_ABORTED") return;
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 500) failedRequests.push(`${res.status()} ${res.url()}`);
  });

  return { consoleErrors, pageErrors, failedRequests };
}

test.describe("critical pages load cleanly", () => {
  const publicPages = ["/", "/collections", "/product/oxford-shirt", "/cart", "/about", "/journal"];

  for (const path of publicPages) {
    test(`${path} — no console errors, no JS errors, no failed requests`, async ({ page }) => {
      const errors = trackErrors(page);
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
      await page.waitForLoadState("networkidle");

      expect(errors.pageErrors, "uncaught JS errors").toEqual([]);
      expect(errors.consoleErrors, "console.error calls").toEqual([]);
      expect(errors.failedRequests, "failed network requests").toEqual([]);
    });
  }

  test("customer account page loads cleanly", async ({ browser }) => {
    const context = await browser.newContext({ storageState: customerStorageState });
    const page = await context.newPage();
    const errors = trackErrors(page);

    const response = await page.goto("/account");
    expect(response?.ok()).toBe(true);
    await page.waitForLoadState("networkidle");

    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.failedRequests).toEqual([]);
    await context.close();
  });

  test("admin dashboard loads cleanly", async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminStorageState });
    const page = await context.newPage();
    const errors = trackErrors(page);

    const response = await page.goto("/admin");
    expect(response?.ok()).toBe(true);
    await page.waitForLoadState("networkidle");

    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.failedRequests).toEqual([]);
    await context.close();
  });
});

test.describe("navigation stability", () => {
  test("moving through the main storefront in sequence stays error-free", async ({ page }) => {
    const errors = trackErrors(page);
    const path = ["/", "/collections", "/product/oxford-shirt", "/journal", "/about", "/cart", "/"];

    for (const url of path) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }

    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });

  test("repeated navigation does not cause runaway JS heap growth", async ({ page }) => {
    // A best-effort signal, not a precise leak detector: performance.memory
    // is Chromium-only and coarse, but a page that's leaking badly across
    // dozens of navigations should show it growing without bound.
    await page.goto("/");
    const supportsMemoryApi = await page.evaluate(() => "memory" in performance);
    test.skip(!supportsMemoryApi, "performance.memory unavailable in this browser");

    const heapBefore = await page.evaluate(
      () => (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
    );

    for (let i = 0; i < 15; i++) {
      await page.goto(i % 2 === 0 ? "/collections" : "/");
    }
    // Give the browser a chance to run GC between navigations before reading.
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

    const heapAfter = await page.evaluate(
      () => (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
    );

    const growthMB = (heapAfter - heapBefore) / 1024 / 1024;
    expect(growthMB).toBeLessThan(50);
  });
});
