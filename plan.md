# plan.md — MindLeaf (React + FastAPI) Development Plan

## 1) Objectives
- Deliver a working web-based MVP for **AI children’s stories**: prompt → story pages → illustrations → read aloud → save → view in library → export PDF.
- Prove and harden the **core AI pipeline** (Gemini text + Nano Banana images) before building the full app.
- Implement a **clean REST API** (FastAPI) reusable by a future Flutter frontend.
- Add **Paystack** payments with webhook-based credit top-ups.

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation: AI + Storage)
**Goal:** Prove end-to-end story generation works reliably (text + N illustrations) and can be saved/returned.

User stories:
1. As a builder, I want a script that generates a multi-page story so I can validate Gemini output format.
2. As a builder, I want a script that generates one illustration per page so I can validate Nano Banana integration.
3. As a builder, I want to persist a generated story to MongoDB and reload it so I can verify data modeling.
4. As a builder, I want deterministic retries/backoff so temporary model failures don’t break generation.
5. As a builder, I want a single “generate_story()” backend function so the app can call one endpoint.

Steps:
- Websearch/Playbook check: verify Emergent LLM usage patterns + Nano Banana image generation best practices (prompting, size, latency).
- Define story JSON contract (title, pages[{page_no,text,image_url/base64}], metadata: age_range, subject, art_style).
- Write minimal Python POC scripts:
  - `poc_gemini_text.py`: generate 3–5 pages with strict JSON schema.
  - `poc_nano_banana_image.py`: generate 1 image from a page summary.
  - `poc_end_to_end.py`: text → images → store in Mongo → load → print stats.
- Iterate prompts + schema validation until stable.

Exit criteria:
- 3 consecutive runs succeed producing valid JSON + images and saving/reloading from Mongo.

---

### Phase 2 — V1 App Development (No Auth Initially)
**Goal:** Build a usable MVP around the proven core flow; use a simple “demo user” until Phase 4.

User stories:
1. As a parent, I want to fill a story form and generate a story so my child can read it.
2. As a reader, I want to flip pages horizontally so it feels like a real storybook.
3. As a parent, I want the story read aloud using browser voices so my child can listen.
4. As a parent, I want to download a PDF so I can print/share the story.
5. As a user, I want a library grid so I can revisit generated stories later.

Backend (FastAPI):
- Implement core endpoints (no auth):
  - `POST /api/stories/generate` (credits simulated server-side for demo user)
  - `GET /api/stories` (list)
  - `GET /api/stories/{id}`
  - `DELETE /api/stories/{id}`
  - `GET /api/health`
- Implement PDF export:
  - `GET /api/stories/{id}/pdf` → returns PDF bytes
- Store images:
  - MVP: store as base64 or persist to server/static + store URL (choose simplest reliable).

Frontend (React web, green/orange playful theme but “web style”):
- Pages: Home, New Story, Viewer, Library.
- Story Creator form with chips, selectors, credit cost cards, loading overlay steps.
- Viewer:
  - Horizontal page navigation (buttons/trackpad friendly)
  - Web Speech API play/pause + voice selector mapping
  - Export PDF button
- Library grid with cover + delete.

Phase end: 1 round of end-to-end testing (generate → view → TTS → PDF → library delete).

---

### Phase 3 — Payments + Credits (Paystack)
**Goal:** Real credit purchases via Paystack + server-side credit ledger.

User stories:
1. As a user, I want to buy credits with Paystack so I can generate more stories.
2. As a user, I want my credits updated automatically after payment so I don’t contact support.
3. As a user, I want to see my credit balance on the dashboard so I can plan story length.
4. As a user, I want failed/abandoned payments to not add credits so the system is fair.
5. As an admin, I want to see payment events so I can troubleshoot issues.

Steps:
- Add data models: credit_transactions, payment_orders.
- Add endpoints:
  - `POST /api/payments/paystack/init` (create transaction, return authorization_url)
  - `POST /api/payments/paystack/webhook` (verify signature, confirm with Paystack API, credit user)
  - `GET /api/payments/history` (user)
- Add frontend Buy Credits page with packages and Paystack redirect flow.
- Ensure idempotency in webhook (same reference can’t credit twice).

Phase end: 1 round of payment flow testing (test mode) + webhook verification.

---

### Phase 4 — Auth + Admin (Production-lean)
**Goal:** Add JWT auth + refresh cookie; secure credits, stories, admin tools.

User stories:
1. As a user, I want to register/login so my stories and credits are tied to my account.
2. As a user, I want my session to refresh seamlessly so I’m not logged out unexpectedly.
3. As a user, I want only my library visible so privacy is preserved.
4. As an admin, I want to grant credits so I can support users.
5. As an admin, I want to promote/demote roles so I can manage the platform.

Steps:
- Implement auth endpoints (`/api/auth/register|login|refresh|logout`) with refresh cookie.
- Update stories endpoints to require auth + enforce ownership.
- Admin endpoints:
  - `GET /api/admin/users`
  - `POST /api/admin/users/{id}/credits`
  - `POST /api/admin/users/{id}/role`
- Frontend: auth pages + admin dashboard + protected routes.

Phase end: 1 round of end-to-end testing across roles (user vs admin).

---

### Phase 5 — Hardening, UX polish, Regression Testing
User stories:
1. As a user, I want generation failures to show clear errors and not charge credits.
2. As a user, I want to retry generation so temporary AI failures don’t stop me.
3. As a user, I want faster page loads so the app feels smooth.
4. As a parent, I want content to be age-appropriate so it’s safe for kids.
5. As a builder, I want stable APIs so my future Flutter app can integrate easily.

Steps:
- Add structured logging, request IDs, timeouts/retries.
- Add content safety constraints in prompts.
- Add basic rate limiting per user.
- API documentation (OpenAPI tags + examples).
- Regression tests (core endpoints + auth + payment webhook idempotency).

---

## 3) Next Actions
1. Run Phase 1 POC: implement the 3 Python scripts and validate Gemini Flash + Nano Banana outputs.
2. Confirm the story JSON schema and illustration count rules (pages vs length option).
3. Ask for/prepare Paystack keys later (Phase 3) + decide test mode.
4. After POC passes, build Phase 2 MVP (React + FastAPI) in one cohesive pass.

---

## 4) Success Criteria
- Core: generate story text + N illustrations reliably and save/retrieve from Mongo.
- MVP: user can generate, view page-by-page, listen via Web Speech, export PDF, and manage a library.
- Payments: Paystack purchase credits works with webhook verification + idempotency.
- Auth/Admin: JWT + refresh cookie works; user isolation enforced; admin can manage users/credits.
- Backend: REST API clean enough for a future Flutter client without changes.