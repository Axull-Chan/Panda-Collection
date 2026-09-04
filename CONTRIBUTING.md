# Contributing

Thanks for considering contributing to this project. It started as a solo
portfolio build and is now live software for a real business, but issues,
suggestions, and pull requests are welcome.

## Before you start

For anything beyond a small fix, please open an issue first to discuss the
change — it saves everyone time if the approach needs adjusting before any
code is written.

## Development setup

```bash
git clone https://github.com/Axull-Chan/Panda-Collection.git
cd Panda-Collection
npm install
cp .env.example .env   # fill in your own Supabase project's values
npm run dev
```

See the [README](./README.md#getting-started) for the full setup, and
[DEPLOYMENT.md](./DEPLOYMENT.md) for backend/Stripe configuration.

## Making changes

1. Fork the repo and create a branch off `main`.
2. Make your change. Keep it focused — a single logical change per PR is
   much easier to review than several bundled together.
3. Run the checks locally before opening a PR:
   ```bash
   npm run build   # typecheck + production build
   npm run lint     # oxlint
   npm run test:e2e # Playwright suite (see note below)
   ```
4. Open a pull request with a clear description of *what* changed and
   *why*. Link the issue it addresses, if any.

## Running the test suite

The Playwright suite exercises real Supabase auth/database/storage and
real Stripe test-mode payments — it needs its own dedicated QA customer
and admin accounts, never your personal Supabase user. See
[DEPLOYMENT.md](./DEPLOYMENT.md#running-the-playwright-suite) for setup.
If you can't run the full suite locally, say so in your PR description —
a reviewer can run it before merging.

## Code style

- TypeScript strict mode; the build (`npm run build`) must pass with zero
  errors.
- `oxlint` must pass with zero warnings introduced by your change.
- Match the existing conventions in the file/folder you're editing (see
  [`docs/project-structure.md`](./docs/project-structure.md)) rather than
  introducing a new pattern for something that already has one.
- Comments should explain *why*, not *what* — code that needs a comment to
  explain what it does usually reads better rewritten instead.

## Reporting bugs

Open an issue with: what you expected, what actually happened, and steps
to reproduce. For security vulnerabilities, please follow
[SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Code of Conduct

This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md) — please
read it before participating.
