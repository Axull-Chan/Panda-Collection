import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
config({ path: path.join(root, "..", ".env.test") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} in .env.test — copy .env.test.example and fill in dedicated test credentials.`
    );
  }
  return value;
}

export const testEnv = {
  customerEmail: required("TEST_CUSTOMER_EMAIL"),
  customerPassword: required("TEST_CUSTOMER_PASSWORD"),
  adminEmail: required("TEST_ADMIN_EMAIL"),
  adminPassword: required("TEST_ADMIN_PASSWORD"),
  supabaseUrl: required("VITE_SUPABASE_URL"),
  supabaseAnonKey: required("VITE_SUPABASE_PUBLISHABLE_KEY"),
};
