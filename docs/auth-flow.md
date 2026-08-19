# Authentication Flow

Email/password authentication via Supabase Auth (`@supabase/supabase-js`),
wrapped in a single `AuthContext` ([`src/context/AuthContext.tsx`](../src/context/AuthContext.tsx))
that the rest of the app reads from.

## Sign-up

`SignUpPage` collects first name, last name, email, and password, and calls
`supabase.auth.signUp()`. Supabase sends a confirmation email; the account
isn't usable until the link is clicked (`needsConfirmation` is surfaced back
to the UI so it can show the right message rather than silently redirecting
as if sign-in succeeded).

## Sign-in

`SignInPage` calls `supabase.auth.signInWithPassword()`. Errors are shown
with a **generic message** ("invalid login credentials") regardless of
whether the email exists or the password is wrong — this is deliberate:
distinguishing the two cases lets an attacker enumerate registered emails.
The same generic-response principle applies to `forgot-password`.

## Session handling

`AuthContext` subscribes to `supabase.auth.onAuthStateChange()` and keeps a
`user`/`profile`/`loading` triple in React state. `loading` exists
specifically so route guards ([`RequireAuth`](../src/components/RequireAuth.tsx),
[`RequireAdmin`](../src/admin/RequireAdmin.tsx)) can wait for the *initial*
session check to resolve before deciding to redirect — without it, a
signed-in user refreshing the page would flash through a sign-in redirect
before their session finished loading.

### "Remember me" and per-device session scoping

Unchecking "remember me" marks the session as **ephemeral**
(`localStorage` flag) and ends it the next time the app opens in a context
that isn't the same browser tab (detected via `sessionStorage`, which,
unlike `localStorage`, doesn't carry over to a new tab). This intentionally
does **not** end the session in the tab you're still using — only a
genuinely new tab/window inheriting a "don't remember me" session gets
signed out of it.

Signing out explicitly uses `supabase.auth.signOut({ scope: "local" })`
rather than the client default (`scope: "global"`). This distinction
matters: `"global"` revokes *every* active session for the account, so a
customer signing out on their phone would otherwise silently end their still
-active session on their laptop too. `"local"` ends only the session in the
current browser — matching how sign-out behaves on virtually every
consumer product.

## Protected routes

`RequireAuth` redirects unauthenticated visitors to `/account/sign-in`,
remembering the page they were headed to (`location.state.from`) so sign-in
returns them there rather than dumping them on the account home. `RequireAdmin`
does the same for `/admin/*`, additionally checking `profile.role === "admin"`
— enforced again, independently, by RLS at the database layer, so a
route-guard bug alone could never expose admin data.

## Password reset

`sendPasswordReset()` calls `supabase.auth.resetPasswordForEmail()` with a
redirect back to `/account/reset-password`. A missing or expired recovery
token on that page is treated as "link expired" rather than surfacing a raw
Supabase error.

## See also

- [`architecture.md`](./architecture.md) — how RLS backs up every client-side auth check
- [`tests/authentication/`](../tests/authentication) — the Playwright coverage for every case above, including the sign-out scoping behavior
