# Security Policy

## Project context

This is a portfolio project. The deployed site runs Stripe in **Test
Mode** — no real payment data or real money is ever processed, and no real
customer data is collected in the ordinary course of using the demo.
That said, real engineering practices are followed throughout (see
[`docs/`](./docs) and [PROJECT_SHOWCASE.md](./PROJECT_SHOWCASE.md#security-features)),
and responsible disclosure is still very much appreciated if you find an
issue.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for a security
vulnerability. Instead, email **axel.avt99@gmail.com** with:

- A description of the issue and its potential impact
- Steps to reproduce (or a proof of concept)
- Any suggested remediation, if you have one

You should receive an acknowledgment within a few days. Once resolved,
credit is happily given in the fix's commit/changelog entry unless you'd
prefer to remain anonymous.

## Supported Versions

This project doesn't maintain multiple parallel released versions — only
the latest code on the default branch is supported. Please report issues
against the current `main`.

## Scope

In scope: this repository's application code, Supabase Edge Functions, and
database migrations/RLS policies. Out of scope: Supabase's and Stripe's own
platforms — please report issues with those directly to
[Supabase](https://supabase.com/security) or
[Stripe](https://stripe.com/docs/security/disclosure) respectively.

## What's already been hardened

Documented in detail in [PROJECT_SHOWCASE.md](./PROJECT_SHOWCASE.md#security-features)
and [`docs/database.md`](./docs/database.md#row-level-security-rls):
Row Level Security on every table, independently-enforced admin gating,
Stripe webhook signature verification, no secrets in the client bundle,
generic auth error messages (no account enumeration), and server-side rate
limiting on abuse-prone endpoints. If you find a gap in any of these,
that's exactly the kind of report this policy is for.
