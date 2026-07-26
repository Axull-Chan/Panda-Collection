import { chromium, type FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testEnv } from "./env";

const dir = path.dirname(fileURLToPath(import.meta.url));
export const authDir = path.join(dir, ".auth");
export const customerAuthFile = path.join(authDir, "customer.json");
export const adminAuthFile = path.join(authDir, "admin.json");

/**
 * Signs in as each dedicated QA account once via the real sign-in form and
 * saves the resulting storage state, so individual test files can start
 * already authenticated instead of repeating a UI login in every test.
 * The accounts themselves are provisioned out-of-band (real signup API +
 * a one-time SQL email-confirm/role-grant) — this only ever logs in.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:5173";
  const browser = await chromium.launch();

  await signIn(browser, baseURL, testEnv.customerEmail, testEnv.customerPassword, customerAuthFile);
  await signIn(browser, baseURL, testEnv.adminEmail, testEnv.adminPassword, adminAuthFile);

  await browser.close();
}

async function signIn(
  browser: import("@playwright/test").Browser,
  baseURL: string,
  email: string,
  password: string,
  outFile: string
) {
  const page = await browser.newPage({ baseURL });
  await page.goto("/account/sign-in");
  // exact: true — the page footer's newsletter input has an overlapping
  // aria-label ("Email address"), which substring-matches "Email" otherwise.
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Not waitForURL: the post-login redirect is a client-side route change
  // (react-router pushState), which never fires the "load" event that
  // waitForURL's default waitUntil condition waits on — it would hang for
  // the full timeout on every run. Waiting on the authenticated heading
  // both sidesteps that and proves the profile actually loaded.
  await page.getByRole("heading", { name: /welcome back/i }).waitFor({ timeout: 15_000 });
  await page.context().storageState({ path: outFile });
  await page.close();
}
