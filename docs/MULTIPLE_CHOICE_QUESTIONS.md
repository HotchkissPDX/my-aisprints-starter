# Multiple choice questions — Technical PRD

## Overview

This document specifies **multiple choice question (MCQ) management** for the application: authenticated users can **create, list (with server-side pagination), read, update, and delete** their own questions. Each question has a **description**, **question text**, and **two to six** answer **choices** (strings), with **exactly one** choice marked **correct**. The **`/questions`** **index** is a **server-driven table** with search, pagination, **preview** (radio + in-browser grading, correct choice highlighted on wrong answers), and **delete** (confirmed). **Create** and **edit** use **dedicated routes** **`/questions/new`** and **`/questions/[id]/edit`** with **react-hook-form** + **`mcQuestionWriteBodySchema`**, **`POST` / `PUT`** to the API, then client navigation back to **`/questions`**. UI uses **shadcn-style** components and Tailwind, consistent with the auth work in `docs/BASIC_AUTHENTICATION.md`.

This PRD follows `docs/TEMPLATE_TECHNICAL_PRD.md` and aligns with `docs/PRODUCT_OVERVIEW.md` (question management after sign-in).

**Implementation status:** **Phases 1–5** are in the codebase: D1 schema, **`mc-question-service`**, **`/api/questions`**, the **server-driven question index** (`/questions`) with search, pagination, truncation + tooltips, row **Preview** (dialog + `fetch` API), **Delete** (AlertDialog + `DELETE` + `router.refresh()`), and **full create/edit** on **`/questions/new`** and **`/questions/[id]/edit`** (`McQuestionWriteForm`, **`POST` / `PUT`**, **`credentials: 'include'`**).

### Scope boundary (explicit)

**In scope:** Only the behaviors and surfaces described in this document—MCQ CRUD, paginated index with **description search**, route-based create/edit, hard delete with confirmation, author preview with client-side grading and post-submit highlighting of the correct choice, truncation in the table, and **`user_id` scoping** on all data access.

**Out of scope for this PRD:** Any feature **not** named here (including but not limited to: analytics, sharing, collaboration, versioning, tags/categories beyond description search, student-facing quiz runs, timed attempts, scoring history, import/export, bulk operations, reordering choices via drag-and-drop, soft delete, a **dedicated server endpoint** that grades preview submissions without returning correctness in the initial payload, PATCH updates, extra tables or APIs). Those require a **new or amended PRD** before implementation.

---

## Business requirements

### Content model

- Every multiple choice question has a **description** (string) that contextualizes the item.
- Every question has **question text** (string) that states the prompt the respondent answers.
- Every question has **between two and six** choices, each **choice text** is a string.
- **Exactly one** choice per question is **correct**; the system must enforce this on create and update.

### Management (CRUD)

- Users can **add** a new question via **Add question**, navigating to **`/questions/new`** (full-page form route).
- Users can **see** their questions in a **paginated table** on **`/questions`**, with **server-side search** filtering rows where the **description** matches a case-insensitive substring (see API).
- Users can **edit** an existing question (same field rules as create).
- Users can **delete** an existing question, with appropriate confirmation to avoid accidents.
- Users can **preview** a question: see description + prompt + choices, pick **one** option (radio), **submit**, and receive **immediate visual feedback** on whether the selection was correct; if the answer was **wrong**, the **correct choice must be clearly highlighted** so the author sees the full picture (see **Decided product rules**).

### Access and security

- All question data is **scoped to `user_id`** matching the **current session**. List, get, update, delete, and search apply **`WHERE user_id = currentUser`**. Requests for an **`id` belonging to another user** must return **404** (not found) to avoid leaking existence—**same for edit, delete, and preview data loads**.
- **Pages** (`/questions`, …): unauthenticated users are redirected by **`src/middleware.ts`** (see `docs/BASIC_AUTHENTICATION.md`).
- **`/api/questions` (implemented):** these routes are **not** in the middleware matcher. Handlers call **`requireAuth()`** (`src/lib/auth/require-session.ts`), which uses **`getSessionFromCookies()`** → **`verifySession()`** (`src/lib/auth/session-token.ts`) — **HMAC-SHA256** over the cookie payload plus **expiry** check, same secret as login/signup (**`AUTH_SECRET`**). Missing/invalid/expired session → **401** JSON (`{ "error": "Unauthorized" }`), not a redirect. See **README.md** → *API authentication* for the full chain.

### Data integrity

- Validation must reject fewer than two or more than six choices.
- Validation must reject zero or more than one choice marked correct.
- Empty or whitespace-only strings for description, question text, or choice text must be rejected after **trim** (see **Validation** below).

### Validation (API and forms)

- **Trim** leading/trailing whitespace on description, question text, and each choice text before validation; reject if the result is empty.
- **Maximum lengths:** **implemented** in `src/lib/schemas/mcq-api.ts` as `MCQ_DESCRIPTION_MAX_LENGTH` (**500**), `MCQ_QUESTION_TEXT_MAX_LENGTH` (**3000**), `MCQ_CHOICE_TEXT_MAX_LENGTH` (**500**); tune in code without a PRD if needed. **`POST` / `PUT`** use **`parseMcQuestionWriteBody`** inside **`createMcQuestion` / `updateMcQuestion`**; **`GET` list** uses **`parseMcQuestionListParams`** inside **`listMcQuestions`**. Invalid input surfaces as **400** with **`firstMcqZodIssueMessage`** from the route handlers.

---

## Technical requirements

### Database schema

Use **normalized** tables: one row per question, one row per choice. IDs match existing project convention (`TEXT PRIMARY KEY` with random blob default). All access via `src/lib/d1-client.ts` helpers and parameterized SQL.

**Questions** (owned by user):

```sql
CREATE TABLE mc_questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  question_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mc_questions_user_id ON mc_questions (user_id);
CREATE INDEX idx_mc_questions_user_created ON mc_questions (user_id, created_at DESC);
-- Optional later: index supporting description search patterns if needed; v1 list search uses `instr(lower(...))` (see service).
```

**Choices** (ordered; exactly one `is_correct` per question enforced in application layer and tests):

```sql
CREATE TABLE mc_question_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  FOREIGN KEY (question_id) REFERENCES mc_questions(id) ON DELETE CASCADE,
  UNIQUE (question_id, sort_order)
);

CREATE INDEX idx_mc_choices_question_id ON mc_question_choices (question_id);
```

**Notes**

- SQLite stores booleans as `0`/`1`.
- **Exactly one correct choice** per question: validate in service/API on write (no DB trigger required for v1).
- `ON DELETE CASCADE` removes choices when a question is deleted.
- **ID generation (as implemented):** **`mc_questions.id`** is set in application code when inserting (so the same id can be referenced in the same `batch()` as child rows). **`mc_question_choices.id`** is **not** supplied on `INSERT`; SQLite applies the column **`DEFAULT`** per row.

### API endpoints

Base path: **`/api/questions`**. All routes require an authenticated session via **`requireAuth()`**; **`user_id`** is **`session.userId`** from the verified cookie payload. JSON responses for successful reads/writes are built with **`src/lib/mcq-response.ts`** (`mcQuestionToJson`, `mcQuestionListToJson`).

**Error bodies (implemented):** Unless otherwise noted, errors use `{ "error": "string" }`. **401** — `"Unauthorized"`. **404** — `"Not found"` (missing or not-owned question). **400** — first Zod validation message, or `"Invalid JSON body"` when the body is not JSON. **500** — `"Something went wrong. Please try again."` (unexpected server errors).

#### `GET /api/questions`

**Purpose:** Paginated list of the current user’s questions (for the table).

**Query parameters:**

- `page` — integer ≥ **1** (default **1**).
- `pageSize` — integer (default **20**, maximum **50**).
- `q` — optional string; when present, restrict results to rows whose **`description`** contains the substring (**case-insensitive**). Empty or whitespace-only `q` is treated as no filter. **Implemented:** `instr(lower(description), lower(?)) > 0` with a **bound** `?` parameter (no string concatenation into SQL).

**Sort:** **`created_at` DESC** (newest first) within the filtered set.

**Success (200):**

```json
{
  "items": [
    {
      "id": "string",
      "description": "string",
      "questionText": "string",
      "choiceCount": 4,
      "createdAt": "ISO-8601 string",
      "updatedAt": "ISO-8601 string"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 42
}
```

`totalCount` is the number of rows **matching** `user_id` and optional **`q`** filter (for correct pagination).  
`items` are **summary rows** (no per-choice text); full payload including `isCorrect` on `GET /api/questions/[id]`.

**Errors:** **400** invalid `page` / `pageSize` / `q` (Zod); **401** unauthenticated; **500** server error.

#### `POST /api/questions`

**Purpose:** Create a question with 2–6 choices and exactly one correct.

**Request body:**

```json
{
  "description": "string",
  "questionText": "string",
  "choices": [
    { "text": "string", "isCorrect": false },
    { "text": "string", "isCorrect": true }
  ]
}
```

**Success (201):** Full question object (same shape as **GET** by id below).

**Errors:** **400** validation; **401** unauthenticated; **500** server error.

#### `GET /api/questions/[id]`

**Purpose:** Load one question for **edit**, **preview** (full data), or detail.

**Success (200):** Full question + choices. **Implemented** shape (camelCase):

```json
{
  "id": "string",
  "description": "string",
  "questionText": "string",
  "createdAt": "ISO-8601 string",
  "updatedAt": "ISO-8601 string",
  "choices": [
    {
      "id": "string",
      "text": "string",
      "isCorrect": true,
      "sortOrder": 0
    }
  ]
}
```

Each choice includes **`isCorrect`** (required for **edit** and **preview** browser grading) and **`sortOrder`** (stable ordering, 0-based).

**Errors:** **401**; **404** if id missing or **not owned** by current user; **500**.

#### `PUT /api/questions/[id]`

**Purpose:** **Full replacement** of the question and its entire choice set (same JSON shape as **POST** create: description, questionText, choices array with 2–6 items and exactly one `isCorrect: true`). No partial updates in this PRD.

**Success (200):** Updated full object (same JSON shape as **GET** by id).

**Errors:** **400**; **401**; **404**; **500**.

#### `DELETE /api/questions/[id]`

**Purpose:** **Hard delete** question (choices removed via **CASCADE**).

**Success (204)** no body.

**Errors:** **401**; **404** if not found / not owned; **500**.

---

### User interface requirements

**Stack:** shadcn/ui (**Table**, **Button**, **Form**, **Input**, **Label**, **Textarea**, **RadioGroup**, **DropdownMenu**, **AlertDialog** for delete confirm, **Dialog** for preview, **Tooltip** for truncated table text, **lucide-react** icons for preview feedback), Tailwind, **react-hook-form** + **zod** for create/edit forms, aligned with existing patterns.

#### Page: Question index (`/questions`)

- **Implemented** in `src/app/questions/page.tsx` (Server Component).
- **List data is server-driven:** the page reads **`q`**, **`page`**, and **`pageSize`** from the URL (`searchParams`), loads the current result page **on the server** (service layer or equivalent—**not** by downloading the full corpus for client-side filter/slice). Pagination and search **change the URL**; each request resolves the filtered, paginated set in the database.
- **Heading** and **Add question** → **navigate to `/questions/new`**.
- **Search:** bound to **`q`** in the URL. Submitting a new search **must reset `page` to `1`**. Use a **GET** form and/or **links** so navigation stays shareable and cache-friendly.
- **Table** columns: **description** and **question text** shown **truncated** with **conservative** display-length limits for v1 (tunable later). Full text is shown in a **Tooltip** (shadcn **`Tooltip`**) on hover/focus for truncated cells.
- **Pagination** uses URL **`page`** / **`pageSize`** with defaults **`page=1`**, **`pageSize=20`**, max **`pageSize=50`**; sort **newest first** (`created_at` DESC) on the server.
- **Row actions:** **Edit** → **`/questions/[id]/edit`**, **Delete** (confirm), **Preview** (opens dialog; see below).
- **Empty state** when no rows. **Errors:** invalid list params (**Zod**) trigger a **server redirect** back to **`/questions`** (default listing); there is no dedicated **`loading.tsx`** for this segment (Next.js handles navigation as usual).

#### Pages: Create (`/questions/new`) and edit (`/questions/[id]/edit`)

- **Dedicated routes** (not modals) for discoverable URLs and direct navigation.
- Same form schema: **Description**, **Question text**, **2–6 choices**, exactly one **correct** (radio group across choices).
- **Create** → `POST /api/questions`; **Edit** → `PUT /api/questions/[id]` with full body; on success **return to `/questions`** via **`router.push('/questions')`** and **`router.refresh()`** (same tab). **Edit** loads existing data on the **server** with **`getMcQuestionForUser`** (not the GET API route).
- **String max lengths:** **conservative** caps in zod + API (see **Validation**); adjust numbers later without a PRD if needed.

#### Preview

- From index row **Preview**: open **Dialog**.
- Load payload via **`GET /api/questions/[id]`** (includes **`isCorrect`** on each choice). Preview is for the **question author** only (same session as edit).
- **RadioGroup** single select; **Submit** compares the selected `choiceId` to the choice where `isCorrect === true` **in the browser**.
- **Feedback:** correct → **green** check (or equivalent); incorrect → **red** X **and** **visually highlight the correct choice** (e.g. border/background + icon) so the answer is **unambiguous** after submit.
- **No** persisted “attempt” or grading API in this PRD.
- **Close** dismisses dialog; no history stored.

#### Accessibility

- Radio group labeled; table has sensible headers; dialogs trap focus.

---

## Implementation phases

### Phase 1: Database — ✅ COMPLETED

**Objective:** D1 schema for questions and choices.

**Tasks:**

1. Wrangler migration(s) for `mc_questions` and `mc_question_choices`.
2. Apply **locally** only unless deliberately applying remote (per project policy).

**Deliverables:**

- `migrations/0002_create_mc_questions_tables.sql` — creates `mc_questions` and `mc_question_choices` with indexes and FKs as specified above.

### Phase 2: Domain service — ✅ COMPLETED

**Objective:** Encapsulate CRUD + pagination + validation.

**Tasks:**

1. `src/lib/services/mc-question-service.ts`: list paginated with optional **`q`** filter on description (`instr` + `lower`), get by id + user, create and **full replace** update using a **D1 `batch()`** for atomic question + choices, hard delete.
2. Zod schemas in `src/lib/schemas/mcq-api.ts` (write body, list params, `firstMcqZodIssueMessage` for API error copy).
3. Map DB rows to API DTOs (camelCase JSON) in the service layer.

**Deliverables:**

- `src/lib/services/mc-question-service.ts`
- `src/lib/schemas/mcq-api.ts`
- Tests: `src/lib/services/mc-question-service.test.ts`, `src/lib/schemas/mcq-api.test.ts` (mocked D1 / pure zod).

### Phase 3: API routes — ✅ COMPLETED

**Objective:** HTTP layer wired to session user and service.

**Tasks:**

1. `GET/POST` `src/app/api/questions/route.ts` (list supports `page`, `pageSize`, `q`).
2. `GET/PUT/DELETE` `src/app/api/questions/[id]/route.ts` (**PUT** full body only).
3. Consistent **401/404/400** handling.

**Deliverables:**

- `src/app/api/questions/route.ts`, `src/app/api/questions/[id]/route.ts`
- `src/lib/auth/require-session.ts` — `requireAuth()` for route handlers (401 JSON when no session).
- `src/lib/mcq-response.ts` — JSON DTO serialization (`mcQuestionToJson`, `mcQuestionListToJson`).
- Tests: `src/app/api/questions/route.test.ts`, `src/app/api/questions/[id]/route.test.ts` (mocked service + auth + D1).

### Phase 4: Questions index UI — ✅ COMPLETED

**Objective:** Ship the **`/questions`** table with **search** (`q`), pagination, row actions—all **server-driven** via URL params and server data loading.

**Tasks:**

1. **`/questions` as Server Component:** reads `searchParams` (`q`, `page`, `pageSize`), calls **`getDatabase()`** + **`listMcQuestions`** with **`getSessionFromCookies()`** `userId` — **no** client-side filtering of the full list.
2. GET **search form** (`QuestionsSearchForm`) with hidden **`page=1`** so a new search resets the page; pagination **`Link`**s via **`buildQuestionsListUrl`** preserve **`q`** and **`pageSize`**.
3. shadcn **Table** + **Tooltip** (`TruncatedTableCell`, **`McqTooltipRoot`**); truncation limits in **`src/lib/mcq-display.ts`** (**80** description / **100** question text chars for display). Client **row actions** (`QuestionRowActions`): **DropdownMenu**, **AlertDialog** delete, **Dialog** preview (`McqPreviewDialog` + **RadioGroup**).

**Deliverables:**

- `src/app/questions/page.tsx`
- `src/components/mcq/questions-search-form.tsx`, `questions-pagination.tsx`, `truncated-table-cell.tsx`, `mcq-tooltip-root.tsx`, `question-row-actions.tsx`, `mcq-preview-dialog.tsx`
- `src/lib/mcq-display.ts`, `src/lib/questions-url.ts` (+ Vitest: `mcq-display.test.ts`, `questions-url.test.ts`)
- shadcn-style UI: `table`, `tooltip`, `dialog`, `alert-dialog`, `dropdown-menu`, `radio-group`, `label`, `textarea` under `src/components/ui/`
- Index links to **`/questions/new`** and **`/questions/[id]/edit`**; full-page forms are **Phase 5** deliverables (see below).

### Phase 5: Create / edit forms — ✅ COMPLETED

**Objective:** **`/questions/new`** and **`/questions/[id]/edit`** as full-page forms (**`POST` / `PUT`**, shared **`McQuestionWriteForm`**).

**Tasks:**

1. **`src/app/questions/new/page.tsx`** — create form (`POST /api/questions`); redirect to **`/questions`** on success.
2. **`src/app/questions/[id]/edit/page.tsx`** — load via **`getMcQuestionForUser`** (or **`GET` API**), form + **`PUT /api/questions/[id]`**; on success **redirect to `/questions`**.
3. Shared form component + zod (reuse **`mcQuestionWriteBodySchema`**); **react-hook-form** per project rules.

**Deliverables:**

- `src/components/mcq/mc-question-write-form.tsx` — **`zodResolver(mcQuestionWriteBodySchema)`**, **`useFieldArray`** for 2–6 choices, **RadioGroup** for exactly one correct, **`fetch`** with **`credentials: 'include'`** to **`POST` / `PUT`**. **Hydration:** the choices block mounts after **`useEffect`** so server HTML matches the client first paint (`useFieldArray` row **`id`**s are not SSR-stable); radio **`id`**s use choice **index**.
- `src/components/ui/textarea.tsx` — multiline fields for description and question text (aligned with existing **Input** styling).
- Pages: **`/questions/new`**, **`/questions/[id]/edit`** (session + **`notFound()`** when missing).

**Already shipped (was listed under Phase 5 in an earlier draft):** delete confirm and preview dialog live on the index (Phase 4).

**Status markers:** ✅ COMPLETED · 🚧 IN PROGRESS · ⏳ PLANNED

---

## Technical implementation details

### Key files (implementation)

| Area | Path |
|------|------|
| Migration | `migrations/0002_create_mc_questions_tables.sql` |
| Service | `src/lib/services/mc-question-service.ts` — `listMcQuestions`, `getMcQuestionForUser`, `createMcQuestion`, `updateMcQuestion`, `deleteMcQuestion`; `McQuestionNotFoundError` |
| Validation / limits | `src/lib/schemas/mcq-api.ts` — `MCQ_DESCRIPTION_MAX_LENGTH`, `MCQ_QUESTION_TEXT_MAX_LENGTH`, `MCQ_CHOICE_TEXT_MAX_LENGTH`, `mcQuestionWriteBodySchema`, `mcQuestionListParamsSchema`, `firstMcqZodIssueMessage` |
| Table display | `src/lib/mcq-display.ts` — `MCQ_TABLE_DESCRIPTION_MAX` (**80**), `MCQ_TABLE_QUESTION_TEXT_MAX` (**100**), `truncateForTable`, `tableCellNeedsTooltip` |
| List URLs | `src/lib/questions-url.ts` — `buildQuestionsListUrl` |
| JSON responses | `src/lib/mcq-response.ts` — `mcQuestionToJson`, `mcQuestionListToJson` |
| Session (API) | `src/lib/auth/require-session.ts` — `requireAuth()` |
| HTTP | `src/app/api/questions/route.ts` (`GET`, `POST`), `src/app/api/questions/[id]/route.ts` (`GET`, `PUT`, `DELETE`) |
| Questions UI | `src/app/questions/page.tsx`; `src/components/mcq/*` (incl. `mc-question-write-form.tsx`); `src/app/questions/new/page.tsx`, `src/app/questions/[id]/edit/page.tsx` |
| D1 access | `src/lib/d1-client.ts` (`executeQuery`, `executeQueryFirst`, `executeMutation`, `executeBatch`); placeholders via `src/lib/d1-placeholders.ts` |
| Tests | `src/lib/services/mc-question-service.test.ts`, `src/lib/schemas/mcq-api.test.ts`, `src/app/api/questions/route.test.ts`, `src/app/api/questions/[id]/route.test.ts`, `src/lib/mcq-display.test.ts`, `src/lib/questions-url.test.ts` |

**Phase 5:** **Create** and **edit** forms are implemented on **`/questions/new`** and **`/questions/[id]/edit`**. **`/api/questions`** is not matched by `src/middleware.ts`; unauthenticated calls receive **401 JSON** from handlers (no redirect).

### Implementation patterns

- D1: `executeQuery`, `executeQueryFirst`, `executeMutation`, **`executeBatch`** from `src/lib/d1-client.ts`; `prepare` + `normalizePlaceholders` before `db.prepare().bind()` for batch members (same placeholder rules as other queries).
- Auth (API): **`requireAuth()`** → **`getSessionFromCookies()`** → **`verifySession()`** (see README *API authentication*). **`userId`** is passed into the MCQ service on every operation.
- Auth (pages): **`src/middleware.ts`** + cookie verification for matched paths; does not run on **`/api/questions`**.
- **Index page (`/questions`):** **Server Component** calls **`getDatabase()`** + **`listMcQuestions`** with **`userId`** from **`getSessionFromCookies()`** (defensive **`redirect('/')`** if null); URL holds **`q`**, **`page`**, **`pageSize`**. Row **Preview** and **Delete** use **`fetch`** to **`/api/questions/[id]`** with **`credentials: 'include'`**.
- UI: shadcn-style components under `src/components/ui/`; MCQ-specific under `src/components/mcq/`.
- **Create/edit form:** **`Label`** (not **`FormLabel`**) for the static **“Choices”** section title—**`FormLabel`** requires a surrounding **`FormField`**.

### Important notes

- List endpoint should not need to load all choice text if summaries suffice; full choice payload on `GET /api/questions/[id]`.
- **Create and update:** run all statements for one save (insert/update question + insert/delete choices) in a **single D1 `batch()`** call, which D1 executes **atomically** (all succeed or all roll back). If parameter-binding quirks appear with batch, document and resolve per project policy without abandoning atomicity if possible.
- **Choice inserts** omit `id`; **`mc_questions`** create supplies **`id`** from `randomHexId()` in the service so child rows can reference it in the same batch.

---

## Success criteria

### Backend (Phases 1–3) — implemented

- [x] D1 tables **`mc_questions`** / **`mc_question_choices`** with ownership and CASCADE (migration applied per environment policy).
- [x] Service enforces **user scoping**, **2–6 choices**, **exactly one correct**, **trim** + max lengths, **paginated list** with **`q`**, **atomic** create/update via **`batch()`**.
- [x] **`GET/POST /api/questions`** and **`GET/PUT/DELETE /api/questions/[id]`** with **401** / **404** / **400** / **500** behavior and JSON shapes above; **DELETE** returns **204** empty body on success.
- [x] **API ownership:** list only returns the current user’s rows; **GET/PUT/DELETE** by another user’s id → **404** with `{ "error": "Not found" }` (no existence leak).
- [x] Vitest coverage for service, zod schemas, and route handlers (mocked dependencies).

### Index UI (Phase 4) — implemented

- [x] **`/questions`** table loaded on the **server** from D1 via **`listMcQuestions`**; URL carries **`q`**, **`page`**, **`pageSize`**; search form submits **GET** with hidden **`page=1`** to reset page when **`q`** changes.
- [x] **Pagination** preserves **`q`** and non-default **`pageSize`**; **Previous** / **Next** use **`Link`** + **`buildQuestionsListUrl`**.
- [x] **Hard delete** from row actions: **AlertDialog** confirmation, **`DELETE`** API, **`router.refresh()`**.
- [x] **Preview** dialog: **`GET`** question, **RadioGroup**, submit grades in browser; wrong answer highlights **correct** choice (green border) and selected wrong choice (red).
- [x] Table **truncation** (**80** / **100** chars) + **Tooltip** for full text when truncated.
- [x] **shadcn-style** Table, Button, Dialog, AlertDialog, DropdownMenu, Tooltip, RadioGroup, Input, Card, Label, Textarea (create/edit).

### Forms & polish (Phase 5) — implemented

- [x] **`/questions/new`** full create form + **`POST`**; **`/questions/[id]/edit`** load + **`PUT`**; redirect to **`/questions`** after save.
- [x] **No features** beyond this PRD without an amended spec.

---

## Troubleshooting guide

- **`GET/POST /api/questions` returns 401** — Session cookie missing, expired, tampered, or signed with a different **`AUTH_SECRET`** than the one used at login. Ensure **`credentials: 'include'`** on `fetch` from the browser. **`/api/*`** is not covered by page middleware, so the handler must receive a valid cookie.
- **`GET /api/questions` returns 400** — Check **`page`**, **`pageSize`** (1–50 after clamp), or malformed query handling; message is the first Zod issue.

---

## Future enhancements

Items below are **not** committed scope; add to a future PRD when prioritized.

- Additional filters/sort columns beyond **description substring** + **created_at** DESC (e.g. by question text, tags).
- Reorder choices via drag-and-drop.
- Soft delete / archive and restore.
- Separate “student” preview mode that never receives `isCorrect` in the initial payload (server-side grading only).

---

## Dependencies

### External dependencies

- None beyond existing Cloudflare D1 + Workers + Next/OpenNext stack.

### Internal dependencies

- **Authentication** and session cookie (see `docs/BASIC_AUTHENTICATION.md` and **README.md** *API authentication* for the `/api/questions` verification chain).
- **`src/lib/d1-client.ts`** and binding **`my_aisprints_db`**.
- **`users`** table and `user_id` foreign key.

### Environment variables

- No new secrets required beyond existing **`AUTH_SECRET`** for session-backed APIs.

---

## Risks and mitigation

### Technical risks

- **Risk:** Partial writes if question saves but choices fail.  
  **Mitigation:** **D1 `batch()`** for question + choice writes; clear error handling; test failure paths.

- **Risk:** Off-by-one or duplicate “correct” flags after edit.  
  **Mitigation:** Central zod schema + single validation function used by API and forms.

### User experience risks

- **Risk:** Long question text breaks table layout.  
  **Mitigation:** Truncate with **shadcn Tooltip** (full text on hover/focus); responsive column widths.

- **Risk:** Delete mis-clicks.  
  **Mitigation:** AlertDialog with explicit confirm copy.

---

## Decided product rules (summary)

| Topic | Decision |
|--------|-----------|
| Ownership | Questions **scoped to `user_id`**; cross-user id → **404**. |
| List | **`page=1`**, **`pageSize=20`**, max **50**; **`created_at` DESC**; **`q`** filters **description** (case-insensitive substring via bound `instr(lower(...), lower(?))`). |
| Index loading | **Server-side only:** URL **`searchParams`** drive **`q`** / **`page`** / **`pageSize`**; each view loads the filtered page from the DB on the server (**no** client-side slice of the full list). |
| Search + pagination | Changing **`q`** **resets `page` to 1**; use GET navigation (form/links). |
| Create / edit | Routes **`/questions/new`**, **`/questions/[id]/edit`**; update via **`PUT`** (full body). |
| After save (create/edit) | **Back to `/questions`** (`router.push` + `router.refresh()` from the client form). |
| Delete | **Hard delete** + confirm. |
| Preview | After submit, **grade in the browser** using **`isCorrect`** from **`GET /api/questions/[id]`**; on wrong answer, **highlight correct choice**. Author-only. |
| Truncation (table) | **Conservative** display limits for v1; full text in **Tooltip**. |
| Strings | **Conservative** `maxLength` in zod + API; trim; reject empty after trim; numbers tunable without a PRD. |
| Writes | **D1 `batch()`** for create/update so question + choices are **atomic**. |
| DB trigger | **Not** required for “exactly one correct” in v1. |
| Scope | **Only** what this PRD describes—no extra features without a new/amended spec. |
| API vs page auth | **Middleware** redirects on protected **pages**; **`/api/questions`** returns **401 JSON** after **`verifySession`** (no redirect). |

---

## Notes for AI agents

When updating this PRD:

1. Keep phase status markers accurate.
2. Fill **Technical implementation details** with real paths as code lands.
3. Mark **Success criteria** when verified.
4. Keep **Decided product rules** in sync with the **Overview**, **API**, and **UI** sections if requirements change.
5. Use `filepath:line-number` when citing implementation.
6. **`useFieldArray`** row **`id`** values are **not stable across SSR and client**; do not use them in SSR-rendered DOM **`id`** attributes without a client-only mount gate (see **`mc-question-write-form.tsx`**).

---

## Current status

**Last updated:** 2026-04-08  
**Implementation:** Phases **1–5** **done** — D1 schema, **`mc-question-service`**, **`/api/questions`**, server-driven **`/questions`** index (search, pagination, preview, delete), and **create/edit** forms on **`/questions/new`** and **`/questions/[id]/edit`**.  
**Status:** ✅ COMPLETED (MCQ scope per this PRD)  
**Next steps:** Only **future enhancements** (below) or a **new/amended PRD** for additional behavior.
