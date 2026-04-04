# plan.md — MindLeaf (React + FastAPI) Development Plan (Final)

## 1) Objectives
- Deliver a working web-based product for **AI children’s stories**: prompt → story pages → illustrations → read aloud → save → view in library → export PDF.
- Ensure the backend remains a **clean REST API** reusable by a future Flutter frontend.
- Provide **production-lean authentication** (JWT access token + refresh token in httpOnly cookie).
- Provide **Nigerian payments scaffolding** (Paystack) for credit purchases (keys can be supplied later).
- Improve story quality with:
  - a **proper cover/thumbnail “front page”** as the first page (book-cover style with title)
  - **character consistency** across illustrations via a structured **character bible** + prompt strategy.
- Provide an **admin panel** for user management (credits + roles).

**Status:** All phases 1–4 are **completed**.

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation: AI + Storage) ✅ COMPLETED
**Goal:** Prove end-to-end story generation works reliably (text + N illustrations) and can be saved/returned.

Completed outcomes:
- Gemini story text generation stable in strict JSON format.
- Nano Banana illustration generation working (returned as base64 images).
- MongoDB storage CRUD validated.

Exit criteria achieved:
- POC passed with repeated successful runs.

---

### Phase 2 — V1 App Development (No Auth Initially) ✅ COMPLETED
**Goal:** Build a usable MVP around the proven core flow; use a demo-mode approach until auth is added.

Completed features:
- React web UI (green/orange, web style) with:
  - Dashboard (credits + actions + trending topics)
  - Story Creator form (topic chips, age range, subject, length w/ credit costs, art style, optional fields)
  - Story Viewer (page navigation, illustration+text layout, TTS controls via Web Speech API, PDF export)
  - Library grid with thumbnails + delete
- FastAPI backend endpoints implemented:
  - `POST /api/stories/generate`
  - `GET /api/stories`
  - `GET /api/stories/{id}`
  - `DELETE /api/stories/{id}`
  - `GET /api/stories/{id}/pdf`
  - `GET /api/health`

Testing results:
- Backend: Passed
- Frontend: Passed (PDF export may take longer in automated testing due to generation size)

---

### Phase 3 — Payments + Credits (Paystack) ✅ COMPLETED (Placeholder keys)
**Goal:** Add a real credit purchase flow using Paystack; allow keys to be inserted later to go live.

User stories delivered:
1. As a user, I can buy credits via Paystack.
2. As a user, my credits are updated only after successful verification.

Backend delivered:
- Env placeholders supported:
  - `PAYSTACK_SECRET_KEY` (defaults to `sk_test_xxx`)
  - `PAYSTACK_PUBLIC_KEY` (defaults to `pk_test_xxx`)
- Payment/order persistence:
  - `payments` collection storing reference, user_id, package, credits, amount, status.
- Endpoints delivered:
  - `GET /api/credit-packages` (returns packages + paystack public key)
  - `POST /api/payments/paystack/init` (returns authorization_url + reference; returns 503 when placeholder keys are present)
  - `GET /api/payments/paystack/verify/{reference}` (verifies payment and credits user)
  - `POST /api/payments/paystack/webhook` (signature verification + idempotent crediting)

Frontend delivered:
- `/buy-credits` page with NGN pricing and packages.
- Redirect-based Paystack flow (authorization_url).
- `/payment/callback` page that verifies reference and refreshes credits.

Exit criteria achieved:
- Full Paystack integration path implemented.
- Safe “not configured” behavior when placeholder keys are present.

---

### Phase 4 — Auth + Admin + Story Quality Upgrade ✅ COMPLETED
**Goal:** Upgrade MVP to a production-lean system with authentication, admin controls, and better story quality.

#### 4A) Authentication (JWT + Refresh Cookie) ✅ COMPLETED
Delivered:
- JWT access token (Authorization header) + refresh token stored in httpOnly cookie.
- Auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- User isolation enforced (stories scoped by user_id).

Frontend delivered:
- `/login`, `/register` pages.
- Protected routes:
  - `/`, `/create`, `/library`, `/story/:id`, `/buy-credits`, `/admin`
- Auto-refresh on 401 via `/api/auth/refresh`.
- Logout from navbar.


#### 4B) Story Quality Upgrade: Cover Page + Character Bible ✅ COMPLETED
Delivered:
- Story generation now produces:
  - `character_bible` (main character + supporting characters + environment style)
  - `cover_image` (generated cover illustration)
  - pages with prompts that repeat the character bible details for better consistency.
- Cover page is treated as the **front page** in the viewer and the **thumbnail** in the library.

Frontend delivered:
- Story Viewer starts on **Cover** (title + cover image), then page-by-page story.


#### 4C) Admin Dashboard ✅ COMPLETED
Delivered:
- Admin endpoints:
  - `GET /api/admin/users`
  - `POST /api/admin/users/{id}/credits`
  - `POST /api/admin/users/{id}/role`
- Admin UI:
  - `/admin` page with user table
  - Grant credits dialog
  - Role change controls
- Admin seeding:
  - On backend startup, an admin user is seeded:
    - `admin@mindleaf.com` / `admin123`
  - Legacy demo user removed.

Exit criteria achieved:
- Register → Login → Refresh → Logout verified.
- Admin role enforcement verified.
- User ownership enforced for story operations.

---

## 3) Next Actions (Post-MVP / Production Readiness)
These are optional next steps now that phases 1–4 are complete:

1. **Go-live Paystack**
   - Insert real Paystack keys in `/app/backend/.env`:
     - `PAYSTACK_SECRET_KEY=sk_live_...`
     - `PAYSTACK_PUBLIC_KEY=pk_live_...`
   - Register webhook URL in Paystack dashboard.
   - Set `secure=True` for cookies behind HTTPS.

2. **Security hardening**
   - Move JWT secret to a secure secret manager.
   - Rate limiting (per user/IP) for story generation + auth endpoints.
   - Add refresh token rotation persistence (optional).

3. **Reliability/performance**
   - Add retries/timeouts and background job queue for long story generation.
   - Store images in object storage (S3-compatible) instead of base64 in MongoDB for scalability.

4. **API documentation for Flutter integration**
   - Add example requests/responses to OpenAPI.
   - Provide a typed client spec (OpenAPI generator) for Flutter.

---

## 4) Success Criteria (Final)
- ✅ Core AI pipeline: Gemini text + Nano Banana images reliably generated and stored.
- ✅ UX: user can generate, read page-by-page, use Web Speech TTS controls, export PDF, and manage a library.
- ✅ Story quality: every story has a cover page with title; character bible improves illustration consistency.
- ✅ Auth: JWT + refresh cookie works; user isolation enforced.
- ✅ Admin: admin can manage users, credits, and roles.
- ✅ Credits: credit deduction occurs on story generation; packages available for purchase.
- ✅ Payments: Paystack integration implemented end-to-end with safe placeholder-key behavior.
- ✅ Backend: clean REST API suitable for reuse by a future Flutter frontend.
