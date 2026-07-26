import type { Page } from "@playwright/test";
import { testEnv } from "../fixtures/env";

const AUTH_STORAGE_KEY = `sb-${new URL(testEnv.supabaseUrl).hostname.split(".")[0]}-auth-token`;

interface StoredSession {
  access_token: string;
  user: { id: string };
}

/**
 * Reads the current session straight out of localStorage, for tests that
 * call the Supabase REST/Functions API directly (bypassing the app's own
 * client) with the real signed-in user's own privileges — the same ones a
 * real browser session would carry, no service-role bypass.
 * Must run after page.goto() to a same-origin page; localStorage throws on
 * the initial blank page a fresh context starts on.
 */
export async function getStoredSession(page: Page): Promise<StoredSession | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }, AUTH_STORAGE_KEY);
}

export async function getAuthToken(page: Page): Promise<string> {
  const session = await getStoredSession(page);
  return session?.access_token ?? "";
}
