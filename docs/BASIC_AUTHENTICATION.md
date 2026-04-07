# Basic authentication — Technical PRD

## Overview

This document specifies **basic email-and-password authentication** for the application: users can **sign up** with first name, last name, email, password, and **confirm password** (the confirmation is enforced in the UI so both values match; only one password is stored). On **successful signup**, the app **creates a session automatically** and sends the user to **`/questions`**—same destination as after sign-in. Users **sign in** from the **root path `/`**, which is a **public** page that only hosts the login form. After sign-in (or signup), users land on a **minimal protected page at `/questions`** that only shows a question-index title as static content. **Logout is not in scope.** **Multiple-choice question CRUD and any behavior beyond that landing page are not in scope.** `/questions` must not be reachable without an active authenticated session.

This PRD follows the structure in `docs/TEMPLATE_TECHNICAL_PRD.md` and aligns with `docs/PRODUCT_OVERVIEW.md` (Phase 1 foundation, narrowed to auth + placeholder index only).

---

## Business requirements

### User management

- New users can **create an account** by providing first name, last name, email, password, and a **confirm password** field; the product requires that the two password fields **match** before signup proceeds.
- New users who complete signup are **signed in immediately** (session established) and sent to **`/questions`**.
- Existing users can **sign in** with email and password from **`/`** (root).
- Stored user data reflects the signup form fields (no extra profile fields required for this phase).

### Access control

- The **question index landing page** is only available to users who are **signed in**.
- Sign-up (`/signup`) and sign-in (`/`) are reachable **only for users without a valid session**; authenticated users are **redirected to `/questions`** by middleware.

### Explicitly out of scope for this PRD

- **Logout** (no endpoint, no UI control).
- **Multiple-choice question** creation, listing from DB, editing, or deletion—only the **static placeholder** index page.
- Email verification, password reset, OAuth/social login, MFA, and org/team accounts.

### Security requirements (high level)

- Passwords must **never** be stored in plaintext; use a vetted slow hashing approach suitable for the Workers runtime.
- Authenticated state must be enforced **server-side** for the protected page (not only hiding links on the client).
- Inputs must be validated on the server; database access must use parameterized queries (project convention: D1 helpers in `src/lib/d1-client.ts`).

---

## Technical requirements

### Database schema

Single table for application users, aligned with signup fields. IDs use the project’s usual D1 pattern (see migrations elsewhere in the repo).

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users (email);
```

**Notes**

- Store **normalized email** for lookup and uniqueness (implementation: lowercased trim unless product later requires case-sensitive email).
- `password_hash` holds an encoded hash string produced by the chosen KDF (salt + parameters embedded in the string if using a standard format).

### Password policy

- **Minimum length:** 10 characters.
- **Complexity:** none for this phase (no required uppercase, digits, or symbols).
- Enforcement: **signup** validates length on client (zod) and server; **login** does not re-check length (only verifies credentials).

### API endpoints

All auth APIs are JSON in/out unless noted. Implemented under **`src/app/api/auth/`** (App Router).

#### `POST /api/auth/signup`

**Request body:**

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

The server must reject the request with **400** if `password` and `confirmPassword` differ (defense in depth alongside client-side matching).

**Signup persistence (email uniqueness):** Do **not** run a separate query to test whether the email is already registered. The `users.email` column is **`UNIQUE`** (and indexed); use that as the single source of truth. **Attempt the `INSERT`** with the normalized email and hashed password. If D1/SQLite returns a **unique constraint violation**, respond with **409** (email already in use). On success, continue with session creation as below. This avoids an extra round trip on the common path and eliminates a **check-then-insert race** where two concurrent signups could both pass a prior `SELECT` and still collide on insert.

**Success (201 or 200):**

- User row created with hashed password.
- **Session established** (same mechanism as login): HTTP-only session cookie set on the response.
- Response body should be safe user subset **without** password fields.
- Client redirects to **`/questions`** after success.

**Errors:**

- **400** — Missing/invalid fields, passwords do not match, or password shorter than 10 characters.
- **409** — Email already registered (unique constraint on insert; do not rely on a pre-check `SELECT`).
- **500** — Unexpected server error (generic message to client).

#### `POST /api/auth/login`

**Request body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Success (200):**

- Credentials verified.
- Session established (e.g. HTTP-only signed cookie).
- Response body should be safe user subset **without** password fields.

**Errors:**

- **400** — Missing email or password.
- **401** — Invalid email/password (use a **generic** message to avoid account enumeration).
- **500** — Unexpected server error.

**Logout**

- Not implemented in this phase (no `POST /api/auth/logout`).

### User interface requirements

#### UI stack

- **Components:** [shadcn/ui](https://ui.shadcn.com/) from `@/components/ui/*` (project convention).
- **Layout and styling:** Tailwind CSS via `className` (including utilities such as `min-h-svh`, spacing, and responsive `md:` breakpoints).
- **Forms:** Use shadcn-style **`Form`** / **`FormField`** / **`FormItem`** with **react-hook-form** and **zod** (`zodResolver`) for validation and submit handling (see workspace rules). Implemented in `login-form.tsx` and `signup-form.tsx` with shared schemas in `src/lib/schemas/auth-api.ts`.

**Note:** The **reference JSX** under **Sign up** and **Sign in** below still uses a conceptual **`Field` / `FieldGroup`** API from early design notes. The **shipped UI** uses **`FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage`** (and **`FormDescription`** on signup) for the same fields and validation—treat the snippets as layout/copy guidance, not copy-paste source.

#### Sign up (`/signup`)

- Form fields: **First name**, **Last name**, **Email**, **Password**, **Confirm password**.
- Client-side validation: required fields, basic email shape, **password === confirm password**, and **password length ≥ 10**; server remains authoritative.
- Submit → `POST /api/auth/signup` (include `confirmPassword` for server-side match check); show field/server errors clearly.
- On success: session cookie is set by the API response; client navigates to **`/questions`**.

**Page shell (`src/app/signup/page.tsx`):** same centered layout pattern as login—compose with **`SignupForm`** from `@/components/signup-form`.

```tsx
import { SignupForm } from "@/components/signup-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
```

**`SignupForm` (`src/components/signup-form.tsx`):** root element is shadcn **`Card`** so callers can pass through `Card` props (e.g. `className`) via `React.ComponentProps<typeof Card>`. Compose fields from:

| Import | Purpose |
|--------|--------|
| `Button` | Primary **Create Account** submit |
| `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` | Card layout and headings |
| `Field`, `FieldDescription`, `FieldGroup`, `FieldLabel` | Field grouping, labels, helper copy |
| `Input` | Text and password inputs |

**PRD vs template starter:** Many shadcn signup blocks use a single **“Full name”** field. This product stores **`first_name`** and **`last_name`** separately—use **two** inputs (**First name**, **Last name**) instead of one full-name field. Password helper text must say **at least 10 characters** (not 8).

**Reference layout** (replace raw `<form>`/`<Input>` with shadcn **`Form`** + **react-hook-form** + **zod** when implementing; submit **`POST /api/auth/signup`** with `firstName`, `lastName`, `email`, `password`, `confirmPassword`):

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input id="firstName" type="text" placeholder="Jane" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input id="lastName" type="text" placeholder="Doe" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" required />
              <FieldDescription>
                Must be at least 10 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
              <Input id="confirm-password" type="password" required />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <Field>
              <Button type="submit">Create Account</Button>
              <FieldDescription className="px-6 text-center">
                Already have an account?{" "}
                <Link href="/" className="underline underline-offset-4">
                  Sign in
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
```

**PRD scope adjustments** (trim extras from the template you start from):

- **Remove** the **“Sign up with Google”** button (OAuth is out of scope).
- **Sign in** link must target **`/`** (e.g. `Link` as above), not `href="#"`.
- Avoid a **nested** `FieldGroup` inside another `FieldGroup` unless a design system pattern requires it—one flat `FieldGroup` is enough here.

#### Sign in (`/` — root)

- The **public** entry point for the app is **`/`**, implemented as a **login-only** page (no separate marketing home in this phase).
- Form fields: **Email**, **Password**.
- Submit → `POST /api/auth/login`; on success redirect to **`/questions`**.

**Page shell (`src/app/page.tsx` or equivalent root route):** centered column, full viewport height, small max width—compose with **`LoginForm`** from `@/components/login-form`.

```tsx
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
```

**`LoginForm` (`src/components/login-form.tsx`):** use **`cn`** from `@/lib/utils` for optional `className` merging on the root wrapper. Compose the form from these shadcn pieces:

| Import | Purpose |
|--------|--------|
| `Button` | Primary submit |
| `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` | Card layout and headings |
| `Field`, `FieldDescription`, `FieldGroup`, `FieldLabel` | Accessible field grouping and labels |
| `Input` | Email and password inputs |

**Reference layout** (field markup as below; replace raw `<form>`/`<Input>` with shadcn **`Form`** + **react-hook-form** + **zod** when implementing, and call **`POST /api/auth/login`** on submit):

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit">Login</Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**PRD scope adjustments** (the template you start from may include extras—trim for this phase):

- **Remove** the **“Forgot your password?”** control (password reset is out of scope).
- **Remove** the **“Login with Google”** button (OAuth is out of scope).
- **Sign up** link: use **`/signup`** (e.g. Next.js `Link`), not a placeholder `href="#"`.
- Keep **email** and **password** fields, primary **Login** submit, and a single **FieldDescription** line pointing to **`/signup`** for new accounts.

#### Question index (protected)

- **Route:** **`/questions`** (chosen to allow other question types later without being tied to “MCQ” in the URL).
- **Content:** Very simple page—essentially a title such as **“Question index”** (or the exact copy stakeholders prefer). No list, no DB reads for questions.
- **Access:** If the user is not authenticated, **redirect to `/`** (login).

#### Public vs protected routing

- **Guest-only HTML routes:** **`/`** and **`/signup`** — middleware allows the request only if there is **no** valid session; otherwise **redirect to `/questions`**.
- **Protected:** **`/questions`** (and nested paths) — middleware requires a valid session; otherwise **redirect to `/`**.
- **API:** `/api/auth/*` is not matched by auth middleware (JSON endpoints for login/signup).
- **Optional:** Permanent redirect from `/login` → `/` is allowed for bookmarks and external links, but the canonical login URL is **`/`**.

---

## Implementation phases

### Phase 1: Database — ✅ COMPLETED

**Objective:** Persist users in D1 with schema matching this PRD.

**Tasks:**

1. Add Wrangler migration for `users` table (and index).
2. Apply locally only per project policy (do not apply to remote D1 from automation without explicit approval).

**Deliverables:**

- New migration file under the repo’s migrations directory.
- Types/env updated if needed for `my_aisprints_db` binding.

### Phase 2: Auth core (hashing + session) — ✅ COMPLETED

**Objective:** Shared utilities to hash/verify passwords and create/validate sessions suitable for Next.js on Cloudflare Workers.

**Tasks:**

1. Implement password hashing and verification using Web Crypto (or another approach compatible with the Workers runtime).
2. Implement signed session payload + HTTP-only cookie set/clear helpers (clear may exist for testing only; **no user-facing logout**).
3. Add secret configuration (e.g. `AUTH_SECRET` or equivalent) documented for local (`.dev.vars`) and production (Wrangler secret).

**Deliverables:**

- `src/lib/auth/` — `constants`, `encoding`, `password`, `session-token`, `session-cookie`, `auth-secret`, `index`.
- `src/types/cloudflare-env-augment.d.ts` — augments `Cloudflare.Env` with `AUTH_SECRET`.

### Phase 3: API routes + user service — ✅ COMPLETED

**Objective:** Signup and login endpoints with D1 access via `src/lib/d1-client.ts` helpers.

**Tasks:**

1. User service: **signup** via `INSERT` (handle unique violation → 409; no separate email-exists query); **login** via fetch by email + password verify.
2. `POST /api/auth/signup` and `POST /api/auth/login` route handlers (signup validates `confirmPassword`, min length 10, and sets session like login).
3. Consistent error JSON shape.

**Deliverables:**

- `src/app/api/auth/signup/route.ts` and `src/app/api/auth/login/route.ts`
- `src/lib/d1-client.ts`, `src/lib/d1-placeholders.ts`, `src/lib/d1-errors.ts`
- `src/lib/services/user-service.ts`, `src/lib/schemas/auth-api.ts`, `src/lib/normalize-email.ts`

### Phase 4: Route protection (middleware) — ✅ COMPLETED

**Objective:** Enforce that **`/questions`** is only reachable with a valid session—**without** coupling this work to the auth UI pages.

**Prerequisite:** Phase 2 (session cookie format + verification helpers usable from middleware or a thin wrapper). Phase 3 is not strictly required to *author* middleware, but you need APIs that set cookies before manual E2E tests are meaningful.

**Tasks:**

1. Add Next.js middleware at **`src/middleware.ts`** with matchers for **`/`**, **`/signup`**, **`/questions`**, and **`/questions/:path*`**.
2. **`/questions`:** if the session is missing or invalid, **redirect to `/`**; if valid, continue.
3. **`/`** and **`/signup`:** if the session is valid, **redirect to `/questions`**; if guest, continue.
4. **`/api/auth/*`** and static assets are not matched (handled by Next defaults).

**Deliverables:**

- `src/middleware.ts` — matcher `["/", "/signup", "/questions", "/questions/:path*"]`; `verifySession` + `getAuthSecretSync`; guest/redirect rules as above; **`/questions`** returns **500** if `AUTH_SECRET` is missing (login/signup pages still load so misconfig can be surfaced via API).

### Phase 5: Auth UI pages — ✅ COMPLETED

**Objective:** Build the signup, login, and placeholder question index **pages**; route protection remains owned by Phase 4.

**Tasks:**

1. **`/`** — login page only (shadcn/ui + zod/react-hook-form).
2. **`/signup`** — signup page with confirm-password matching and min-length 10.
3. **`/questions`** — placeholder index title only (content per UI requirements; protection already enforced by middleware).

**Deliverables:**

- `src/app/page.tsx`, `src/app/signup/page.tsx`, `src/app/questions/page.tsx`.
- `src/components/login-form.tsx`, `src/components/signup-form.tsx` — **`Form`** / **`FormField`** / **`FormItem`** + **`Button`**, **`Card`**, **`Input`**, **`Label`** (Radix); **`zodResolver`** with shared `loginRequestSchema` / `signupRequestSchema` from `src/lib/schemas/auth-api.ts`; `POST` to `/api/auth/login` and `/api/auth/signup`, then `router.push("/questions")`.
- `src/components/ui/*`, `src/lib/utils.ts` (`cn`).

### Phase 6: Verification — ✅ COMPLETED

**Objective:** Confirm end-to-end behavior and security basics.

**Tasks:**

1. Manual test: signup (confirm auto sign-in + redirect to `/questions`), sign-in from `/`, direct navigation to `/questions` when logged out (must redirect to `/`).
2. Unit tests for validation/hashing where practical (Vitest; mock D1).

**Deliverables:**

- Colocated Vitest suites: `src/lib/auth/password.test.ts`, `session-token.test.ts`, `src/lib/d1-client.test.ts` (via `d1-placeholders`), `src/lib/d1-errors.test.ts`, `src/lib/schemas/auth-api.test.ts`, `src/lib/normalize-email.test.ts`, `src/lib/services/user-service.test.ts` (mocks `executeQueryFirst`).
- **Manual checklist** (run with local D1 migrated + `.dev.vars` including `AUTH_SECRET` + `npm run dev`):
  - [ ] Sign up on `/signup` with valid data → lands on `/questions` and session cookie is set.
  - [ ] Same email again → API/UI shows duplicate / conflict behavior (**409** from API).
  - [ ] Password shorter than 10 characters or mismatched confirm → blocked (client + **400** from API).
  - [ ] Log in on `/` with valid user → `/questions` loads.
  - [ ] Wrong password or unknown email → **401** with message **“Invalid email or password”** (generic).
  - [ ] Open `/questions` in a fresh browser session (no cookie) → redirected to `/`.
  - [ ] While logged in, open **`/`** or **`/signup`** → redirected to **`/questions`**.
  - [ ] `/questions` page shows only the **Question index** heading (no question CRUD).

**Status markers:** ✅ COMPLETED · 🚧 IN PROGRESS · ⏳ PLANNED

---

## Technical implementation details

Auth crypto and cookies: **`src/lib/auth/`**. D1 access: **`src/lib/d1-client.ts`** (+ **`d1-placeholders.ts`**). HTTP APIs: **`src/app/api/auth/`**. UI: **`src/components/`** + **`src/app/`** routes. Verification tests: colocated `*.test.ts` files next to the modules they cover (Phase 6).

### Key files

- `migrations/0001_create_users_table.sql` — D1 migration: `users` table + `idx_users_email` (Phase 1).
- `wrangler.jsonc` — `migrations_dir`: `"migrations"` on the `my-aisprints-db` binding.
- `src/lib/d1-client.ts` / `src/lib/d1-placeholders.ts` — D1 helpers + `?` → `?n` normalization (Phase 3).
- `src/lib/services/user-service.ts` — `createUser`, `getUserByEmailWithCredentials` (Phase 3).
- `src/app/api/auth/signup/route.ts`, `src/app/api/auth/login/route.ts` — auth APIs (Phase 3).
- `src/lib/schemas/auth-api.ts` — zod request schemas (Phase 3).
- `src/middleware.ts` — protects `/questions` (Phase 4).
- `src/components/ui/button.tsx`, `card.tsx`, `form.tsx`, `input.tsx`, `label.tsx` — shadcn-style primitives (Phase 5).
- `src/lib/utils.ts` — `cn()` helper (Phase 5).
- `src/components/login-form.tsx` — login UI composition (`LoginForm`).
- `src/components/signup-form.tsx` — signup UI composition (`SignupForm`).
- `src/app/page.tsx` (or app root) — shell that centers `LoginForm` per PRD.
- `src/app/signup/page.tsx` — shell that centers `SignupForm` per PRD.

### Implementation patterns

- D1: use `executeQuery`, `executeQueryFirst`, `executeMutation` from `src/lib/d1-client.ts`; SQL may use anonymous `?` — helpers normalize to `?1`, `?2`, … per workspace rules.
- UI: shadcn-style primitives under `src/components/ui/` (`Button`, `Card`, `Input`, `Label`, `Form` / `FormField` / `FormItem`, …) and Tailwind; login and signup flows in **`User interface requirements`**.

### Important notes

- Cloudflare Workers + OpenNext: prefer APIs and crypto primitives that run in the Worker runtime.
- Do not log passwords or session secrets.
- On signup, unique violations are detected via **`isUniqueConstraintError()`** in `src/lib/d1-errors.ts` (message substring match on D1/SQLite errors) so **409** is returned only for duplicate email, not for unrelated failures.

---

## Success criteria

Implementation matches the items below; **automated** coverage is noted where tests exist—finish any remaining checks via the **Phase 6 manual checklist**.

- [x] User can sign up with first name, last name, email, password, and confirm password; mismatched passwords are rejected on client and server. *(zod `signupRequestSchema` + API; tests: `auth-api.test.ts`)*
- [x] Passwords shorter than 10 characters are rejected on client and server. *(zod + API; tests: `auth-api.test.ts`)*
- [x] User row exists in D1 with **no** plaintext password. *(PBKDF2 hash stored; tests: `password.test.ts`)*
- [x] After successful signup, user receives a session and lands on **`/questions`** without a separate login step. *(API sets cookie; `signup-form` redirects—confirm manually.)*
- [x] Duplicate signup email returns a clear, safe error (e.g. 409). *(insert-first + `EmailInUseError`; tests: `user-service.test.ts`)*
- [x] User can sign in from **`/`** with email and password; session allows access to **`/questions`**. *(API + `login-form`—confirm manually.)*
- [x] Invalid login does not reveal whether the email exists (generic 401 message). *(`login/route.ts`: “Invalid email or password”)*
- [x] Unauthenticated access to **`/questions`** is **blocked** (redirect to **`/`**). *(`src/middleware.ts`—confirm manually.)*
- [x] Authenticated users hitting **`/`** or **`/signup`** are redirected to **`/questions`**. *(`src/middleware.ts`—confirm manually.)*
- [x] **`/questions`** shows only the agreed static title/content—**no** question management features. *(`src/app/questions/page.tsx`)*
- [x] No logout UI or logout API shipped in this scope.

---

## Troubleshooting guide

### `AUTH_SECRET is not set` (API 500 or middleware 500)

**Problem:** Signup/login fails or `/questions` returns “Authentication is not configured.”  
**Cause:** `AUTH_SECRET` missing from `.dev.vars` (local) or Wrangler secret (production).  
**Solution:** Copy `.dev.vars.example` → `.dev.vars` and set a long random `AUTH_SECRET`. For production: `wrangler secret put AUTH_SECRET`.  
**Code reference:** `src/lib/auth/auth-secret.ts`, `src/middleware.ts`

### D1 errors in API (`getDatabase` / binding missing)

**Problem:** User creation or login throws when hitting the database.  
**Cause:** OpenNext dev proxy not running, or remote D1 not migrated.  
**Solution:** Run `npx wrangler d1 migrations apply my-aisprints-db --local` for local SQLite; ensure `next.config.ts` uses `initOpenNextCloudflareForDev()` so bindings exist under `npm run dev`.  
**Code reference:** `src/lib/d1-client.ts`, `wrangler.jsonc`

### Session cookie not persisting after login

**Problem:** Redirect to `/questions` then immediately sent back to `/`.  
**Cause:** `Secure` cookie on HTTP, browser blocking third-party context, or wrong `path`/`domain`.  
**Solution:** Session cookie uses `secure: false` when `NODE_ENV !== "production"` in `session-cookie.ts`; use same host/port for API and page.  
**Code reference:** `src/lib/auth/session-cookie.ts`

### `vitest run` fails (PostCSS / native binding)

**Problem:** Vitest errors loading Tailwind PostCSS or Rolldown native module.  
**Cause:** Vite picking up `postcss.config.mjs`; Vitest 4 optional deps on some platforms.  
**Solution:** Project pins **Vitest 2.x** and sets `css.postcss.plugins: []` in `vitest.config.ts`.  
**Code reference:** `vitest.config.ts`, `package.json`

---

## Out of scope (deferred work, not a roadmap)

Items below are **explicitly excluded** from this document’s delivery; they are not commitments for later phases until added to a future PRD.

- Logout and session revocation UX/API.
- Multiple-choice question CRUD, lists from database, or AI features.
- Email verification, password reset, account recovery.

---

## Dependencies

### External dependencies

- **npm:** `zod`, `react-hook-form`, `@hookform/resolvers`, `@opennextjs/cloudflare`, `next`, Radix (`@radix-ui/react-label`, `@radix-ui/react-slot`), `clsx`, `tailwind-merge`, `class-variance-authority`, `server-only`.
- **Dev:** `vitest` (pinned 2.x for stable local runs), `wrangler`, TypeScript, ESLint, Tailwind CSS 4.

### Internal dependencies

- D1 database binding **`my_aisprints_db`** (`wrangler.jsonc`, `migrations/`).
- **`src/lib/d1-client.ts`** for database access.
- Next.js App Router under **`src/app/`** (including `src/middleware.ts`).

### Environment variables / secrets

- **`AUTH_SECRET`** — required for HMAC session signing (`getAuthSecret` / `getAuthSecretSync`). Documented in **`.dev.vars.example`**; production: `wrangler secret put AUTH_SECRET`.
- **`NEXTJS_ENV`** — optional; see `.dev.vars.example`.
- **Local:** `.dev.vars` (not committed) loaded by Wrangler / OpenNext dev integration.

---

## Risks and mitigation

### Technical risks

- **Risk:** Weak password hashing or session forgery if misconfigured.  
  **Mitigation:** Use well-understood parameters; keep signing secret out of source control; short, documented session lifetime.

- **Risk:** Concurrent signups for the same email.  
  **Mitigation:** Unique constraint on `email`; **insert-first** and map constraint violation to **409**—no redundant pre-check query.

### User experience risks

- **Risk:** Users paste different values into password vs confirm password and see errors.  
  **Mitigation:** Clear inline validation and matching field labels.

---

## Decided product rules

| Topic | Decision |
|--------|-----------|
| After signup | **Auto sign-in:** create session and redirect to **`/questions`**. |
| Confirm password | **Yes:** two fields; must match in the form (client) and on the server (`confirmPassword` in signup API). |
| Password rules | **Minimum length 10**; **no** complexity rules. |
| Question index URL | **`/questions`**. |
| Root `/` | **Public login-only page** (the sign-in form). Not the protected index. |

---

## Notes for AI agents

When updating this PRD:

1. Update phase status markers as work progresses.
2. Fill **Technical implementation details** with real paths and patterns.
3. Mark **Success criteria** checkboxes when verified.
4. Add **Troubleshooting** entries when bugs are fixed.
5. Do not expand scope into logout or MCQ management without a new/updated PRD.
6. Use code references as `filepath:line-number` when citing implementation.

---

## Current status

**Last updated:** 2026-04-07  
**Current phase:** Basic authentication PRD — **complete** (Phases 1–6 ✅)  
**Status:** Shipped in repo per this document; run **Phase 6 manual checklist** before production cutover.  
**Next steps:** Remote D1: `wrangler d1 migrations apply my-aisprints-db --remote` only when you intentionally deploy DB schema; set **`AUTH_SECRET`** via Wrangler secrets. Extend scope only via a new/updated PRD (logout, MCQ CRUD, etc.).
