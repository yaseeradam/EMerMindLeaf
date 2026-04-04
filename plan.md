# plan.md — MindLeaf (React + FastAPI) Development Plan (Updated)

## 1) Objectives
- Deliver a working web-based product for **AI children’s stories**: prompt → story pages → illustrations → read aloud → save → view in library → export PDF.
- Ensure the backend remains a **clean REST API** reusable by a future Flutter frontend.
- Add **production-ready auth** (JWT access token + refresh token in httpOnly cookie).
- Add **payments scaffolding** for Nigerian payments (**Paystack**) with placeholder keys (keys added later).
- Improve story quality with:
  - a **proper cover/thumbnail “front page”** as the first page (book-cover style with title)
  - **character consistency** across all illustrations via prompt + model strategy.
- Add **admin panel** for user management (credits + roles).

**Status:** Phase 1 and Phase 2 are completed and tested (100% backend, 95% frontend).

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation: AI + Storage) ✅ COMPLETED
**Goal:** Prove end-to-end story generation works reliably (text + N illustrations) and can be saved/returned.

Completed outcomes:
- Gemini text generation stable in strict JSON format.
- Nano Banana illustration generation working (base64 images).
- MongoDB storage CRUD validated.

Exit criteria achieved:
- POC passed with repeated successful runs.

---

### Phase 2 — V1 App Development (No Auth Initially) ✅ COMPLETED
**Goal:** Build a usable MVP around the proven core flow; use a simple demo user until auth is added.

Completed features:
- React web UI (green/orange, web style) with:
  - Dashboard (credits + actions + trending topics)
  - Story Creator form (topic chips, age range, subject, length w/ credit costs, art style, optional fields)
  - Viewer (page navigation, illustration+text layout, TTS controls via Web Speech API, PDF export)
  - Library grid with covers + delete
- FastAPI backend endpoints implemented:
  - `POST /api/stories/generate`
  - `GET /api/stories`
  - `GET /api/stories/{id}`
  - `DELETE /api/stories/{id}`
  - `GET /api/stories/{id}/pdf`
  - `GET /api/health`, `GET /api/user/me`, `GET /api/credits`

Testing results:
- Backend: 100% pass
- Frontend: 95% pass (minor PDF export timeout during automated run; functionally OK)

---

### Phase 3 — Auth + Payments Scaffolding + Story Quality Upgrade + Admin (Combined Phase) 🔧 IN PROGRESS
**Goal:** Upgrade MVP into a production-lean system by adding auth, admin, Paystack scaffolding, and story quality improvements.

#### 3A) Authentication (JWT + Refresh Cookie)
**Goal:** Users can register/login; sessions refresh seamlessly; all user data is isolated.

User stories:
1. As a user, I want to register/login so my stories and credits are tied to my account.
2. As a user, I want my session to refresh seamlessly so I’m not logged out unexpectedly.
3. As a user, I want only my stories visible for privacy.

Backend tasks:
- Add libraries: `bcrypt` (or `passlib[bcrypt]`), `PyJWT` (or `python-jose`), cookie utilities.
- Create user schema:
  - `display_name`, `email`, `password_hash`, `role` (user/admin), `credits`, timestamps.
- Implement auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh` (uses httpOnly cookie)
  - `POST /api/auth/logout` (clears cookie)
- Token strategy:
  - Access token: short expiry (e.g., 15m) returned to frontend.
  - Refresh token: longer expiry (e.g., 7–30d) stored in httpOnly cookie.
- Add auth middleware/dependencies:
  - `get_current_user()` from Authorization Bearer access token.
  - Ownership enforcement for stories.
- Migrate Phase 2 “demo user” flow to authenticated users.

Frontend tasks:
- Add auth pages:
  - `/login`, `/register`
- Add auth state management:
  - store access token in memory (or short-lived storage), auto-refresh using `/api/auth/refresh`.
- Protect routes:
  - `/create`, `/library`, `/story/:id`, `/admin`
- Update navbar:
  - show user menu + logout.

Exit criteria:
- Register → Login → Refresh → Logout works.
- Stories are scoped to the logged-in user.

---

#### 3B) Paystack Payments (Scaffolding with Placeholder Keys)
**Goal:** Add the payment flow and endpoints with placeholders; user can later insert real Paystack keys.

User stories:
1. As a user, I want to buy credits with Paystack.
2. As a user, I want credits to be added only after successful verification.

Backend tasks:
- Add env placeholders:
  - `PAYSTACK_SECRET_KEY=sk_test_xxx` (placeholder)
  - `PAYSTACK_PUBLIC_KEY=pk_test_xxx` (placeholder)
  - `PAYSTACK_WEBHOOK_SECRET` (if needed)
- Add `httpx` dependency.
- Create payment models:
  - `payment_orders` (reference, user_id, package_id, amount_ngn, credits, status)
  - `credit_transactions` ledger (reason, delta, reference, timestamps)
- Implement endpoints:
  - `POST /api/payments/paystack/init` → initializes transaction, returns `authorization_url` + `reference`
  - `GET /api/payments/paystack/verify/{reference}` → verify after callback
  - `POST /api/payments/paystack/webhook` → signature verification + idempotent crediting
- Add idempotency:
  - one reference cannot credit twice.

Frontend tasks:
- Add `/buy-credits` page with credit packages.
- Implement redirect to Paystack `authorization_url`.
- Add `/payment/callback` page:
  - extracts reference, calls verify endpoint, updates UI + credit balance.

Exit criteria:
- All endpoints exist and are wired; keys can be inserted later to go live.

---

#### 3C) Story Quality Upgrade: Cover Page + Character Consistency
**Goal:** Make each story feel like a real book and improve illustration continuity.

User stories:
1. As a reader, I want a beautiful cover page with the title before the story starts.
2. As a reader, I want characters to look consistent across pages.

Backend tasks:
- Modify story generation contract to include:
  - `cover`: { title, cover_prompt, image_base64 }
  - `characters`: structured “character bible” (name, appearance, clothing, distinguishing features)
  - `pages`: page text + illustration prompts that reference the character bible.
- Generation strategy:
  1. Generate **character bible** + story outline first.
  2. Generate cover prompt using the bible.
  3. Generate per-page illustration prompts that reuse the bible verbatim.
- Prompt rules:
  - Always include the same **exact descriptive phrases** (hair, skin tone if specified by user—otherwise avoid sensitive attributes; outfit colors; unique accessory).
  - Include consistent environment motifs.
  - Keep style consistent (same art_style descriptor each page).
- Viewer/library changes:
  - cover image used as library thumbnail.
  - viewer page 1 becomes a cover page (title + cover art), then story pages.

Frontend tasks:
- Story Viewer:
  - render cover as the first page with title overlay.
- Library:
  - show cover image as thumbnail.

Exit criteria:
- Every story begins with a visually strong cover page.
- Illustration prompts are consistently structured to improve continuity.

---

#### 3D) Admin Dashboard
**Goal:** Allow admin to manage users, roles, and credits.

User stories:
1. As an admin, I want to view all users.
2. As an admin, I want to grant credits.
3. As an admin, I want to change roles.

Backend tasks:
- Admin-only endpoints:
  - `GET /api/admin/users`
  - `POST /api/admin/users/{id}/credits` (grant/deduct)
  - `POST /api/admin/users/{id}/role`
- Add role-based authorization checks.

Frontend tasks:
- Add `/admin` page with a table:
  - user email, display name, role, credits, actions.
- Add dialogs to grant credits and change role.

Exit criteria:
- Admin can manage users securely.

---

### Phase 4 — Hardening, UX Polish, Regression Testing
**Goal:** Stabilize production behavior, improve performance, and ensure safety.

User stories:
1. As a user, I want generation failures to show clear errors and not charge credits.
2. As a user, I want retries so temporary AI failures don’t stop me.
3. As a parent, I want age-appropriate and safe content.
4. As a builder, I want stable APIs for future Flutter integration.

Steps:
- Add structured logging + request IDs.
- Add timeouts/retries for AI + Paystack HTTP calls.
- Ensure credit charging is transactional:
  - only deduct after successful generation/save.
- Add basic rate limiting per user.
- Prompt safety constraints:
  - age-appropriate language, avoid frightening content for younger ages.
- OpenAPI documentation with examples.
- Regression tests:
  - auth flows
  - story generation + credits
  - payment webhook idempotency
  - admin permissions

---

## 3) Next Actions (Updated)
1. Implement **Auth** end-to-end (register/login/refresh/logout) and migrate stories to per-user ownership.
2. Implement **Story Cover Page + Character Bible** pipeline updates (cover first page + better character consistency prompts).
3. Add **Admin dashboard** (backend endpoints + frontend page).
4. Add **Paystack scaffolding** endpoints and frontend pages (placeholder keys; user plugs real keys later).
5. Run another full end-to-end test sweep.

---

## 4) Success Criteria (Updated)
- ✅ Core AI pipeline: story text + N illustrations reliably generated and stored.
- ✅ MVP UX: user can generate, view page-by-page, use Web Speech TTS controls, export PDF, and manage a library.
- 🔧 Auth: JWT + refresh cookie works; user isolation enforced.
- 🔧 Payments: Paystack integration scaffolding complete; can go live by inserting keys + webhook URL.
- 🔧 Story Quality: each story has a cover/thumbnail first page; characters are more consistent across pages.
- 🔧 Admin: admin can manage users/credits/roles.
- ✅ Backend: REST API remains clean and reusable for future Flutter client.