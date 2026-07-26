import type { Page } from "@playwright/test";

/**
 * Fills and submits Stripe's hosted Checkout page. Unlike raw CDP-style
 * automation, Playwright's locators pierce iframes automatically, so the
 * card fields (each in their own Stripe-owned iframe) can be targeted the
 * same way as any other field on the page.
 */
export async function payWithTestCard(
  page: Page,
  card: { number: string; name: string } = { number: "4242424242424242", name: "QA Test" }
) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  await page.getByPlaceholder("1234 1234 1234 1234").fill(card.number);
  await page.getByPlaceholder("MM / YY").fill("12/34");
  await page.getByPlaceholder("CVC").fill("123");
  await page.getByPlaceholder("Full name on card").fill(card.name);

  // Stripe's own compliance checkbox for automated agents. Even
  // click({force: true}) still reports "outside of the viewport" here —
  // Playwright's actionability model can't resolve its position for some
  // reason specific to Stripe's own layout, not app behavior. A native
  // DOM click sidesteps that entirely; checking it is the honest, correct
  // action for an automated agent to take.
  const aiDisclosure = page.getByText("I am an AI agent acting on behalf of someone else");
  if (await aiDisclosure.isVisible().catch(() => false)) {
    await aiDisclosure.evaluate((el) => {
      const checkbox = el.closest("label")?.querySelector("input") ?? el;
      (checkbox as HTMLElement).click();
    });
  }

  await page.getByRole("button", { name: /^pay$/i }).click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 30_000 });
}

/** Card number that Stripe's test mode always declines. */
export const DECLINED_TEST_CARD = { number: "4000000000000002", name: "QA Test" };
