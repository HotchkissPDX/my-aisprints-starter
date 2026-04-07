# AISprints Starter

This repository is a starter template for aisprints. It is designed for experienced human programmers who are well-versed in end-to-end software development to use AI effectively for developing and maintaining software applications.

## Purpose

This starter provides a structured approach to AI-assisted development by offering:

- **Cursor rules** (`AGENTS.md` and `.cursor/rules`) — guidelines and constraints for AI-assisted work
- **Technical PRD template** (`docs/TEMPLATE_TECHNICAL_PRD.md`) — structure for technical product requirements and phased delivery
- **Feature PRDs** (e.g. `docs/BASIC_AUTHENTICATION.md`) — example end-to-end specs you can mirror for new work

These resources help keep AI and human contributors aligned on structure, constraints, and delivery phases.

## Prerequisites

- **Node.js** 20 or newer (required by Wrangler and this toolchain)
- **npm** (project uses `package-lock.json`)
- A **Cloudflare** account with Workers and D1 enabled when you deploy or use remote resources

## Quick start

```bash
npm install
```

Then complete **local configuration** below before running the app.

## Configuration

### Local development

1. **Environment variables for OpenNext / Wrangler dev**

   Copy the example file and fill in secrets (do not commit `.dev.vars`):

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   In **`.dev.vars`**, set at minimum:

   - **`AUTH_SECRET`** — long random string used to sign session cookies. Required for login, signup, and `/questions` middleware.
   - **`NEXTJS_ENV`** — optional; defaults in `.dev.vars.example` are fine for local use.

2. **D1 database (local)**

   Apply migrations to the **local** D1 instance (SQLite under Wrangler’s local state):

   ```bash
   npx wrangler d1 migrations apply my-aisprints-db --local
   ```

   The logical database name is **`my-aisprints-db`** (see `wrangler.jsonc`). The Worker binding is **`my_aisprints_db`**.

3. **TypeScript types for bindings** (after you change `wrangler.jsonc`):

   ```bash
   npm run cf-typegen
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign up at `/signup` or sign in at `/`. The app expects `initOpenNextCloudflareForDev()` (see `next.config.ts`) so local requests can reach D1 and other bindings like production-shaped code paths.

### Production

1. **Cloudflare Worker & D1**

   - In the [Cloudflare dashboard](https://dash.cloudflare.com), ensure you have a **D1** database for this project (or create one).
   - Point `wrangler.jsonc` at **your** database: set `database_id` (and if needed `database_name`) to match the D1 resource you use in production. Until you change it, the repo may still reference a template ID—replace it before going live.

2. **Secrets (required)**

   Set the session signing secret in the Worker environment (do not put production `AUTH_SECRET` in `wrangler.jsonc`):

   ```bash
   npx wrangler secret put AUTH_SECRET
   ```

   Paste a strong random value when prompted. This should differ from any local `.dev.vars` secret.

3. **D1 migrations (remote)**

   When you are ready to update the **remote** database schema, apply migrations explicitly (this affects real data):

   ```bash
   npx wrangler d1 migrations apply my-aisprints-db --remote
   ```

   Run this only when you intend to change production schema; coordinate with backups and rollout.

4. **Deploy**

   ```bash
   npm run deploy
   ```

   This runs the OpenNext Cloudflare build and deploy flow configured in the project scripts.

5. **Optional: preview on Workers locally**

   ```bash
   npm run preview
   ```

## Development

- **`npm run dev`** — Next.js dev server (Turbopack) with OpenNext Cloudflare dev integration; requires `.dev.vars` and local D1 migrations as above.
- **`npm run lint`** — ESLint.
- **`npm run test`** — Vitest unit tests.
- **Auth routing (`src/middleware.ts`)** — Without a session, `/questions` redirects to `/`. With a valid session, `/` and `/signup` redirect to `/questions`. `/api/auth/*` is not intercepted by this middleware.

## Project structure (high level)

- `AGENTS.md` — Project / Cursor guidance
- `docs/TEMPLATE_TECHNICAL_PRD.md` — Technical PRD template
- `docs/PRODUCT_OVERVIEW.md` — Product notes
- `docs/BASIC_AUTHENTICATION.md` — Example auth PRD and implementation map
- `src/app/` — Next.js App Router (pages, API routes, middleware via `src/middleware.ts`)
- `migrations/` — D1 SQL migrations
- `wrangler.jsonc` — Cloudflare Worker, D1 binding, migrations directory

## Technology stack

- [Next.js](https://nextjs.org) — React framework
- [Cloudflare Workers](https://workers.cloudflare.com) — hosting
- [OpenNext.js for Cloudflare](https://opennext.js.org/cloudflare) — Next.js on Workers
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — SQLite at the edge

## Further reading

- Wrangler: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- OpenNext Cloudflare: [bindings in local dev](https://opennext.js.org/cloudflare/bindings)
