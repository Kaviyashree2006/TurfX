# TurfX — Step-by-Step Implementation Plan

Sequenced so each phase produces something runnable/testable before moving on. All product decisions are locked (see Doc 00) — this plan builds directly against them with nothing left to confirm.

## Phase 0 — Foundation
- Repo setup (frontend + backend, or monorepo — your call), env config (`.env.example` covering DB URI, JWT secret, Razorpay keys, Cloudinary credentials, SMTP credentials), MongoDB connection.
- `User` model, JWT auth (register/login/refresh), password hashing. **No email verification step** (locked decision #16) — registration completes immediately.
- Access token returned in response body (held in memory by `TokenService`); refresh token set as httpOnly, Secure, SameSite=Strict cookie (locked decisions #18/#19).
- Angular shell: routing skeleton, auth service, login/register pages, guards wired but permissive (roles not yet meaningful).
- **Exit check:** can register as customer and as owner, log in, see role-appropriate empty dashboard; page reload silently recovers session via the refresh-token cookie.

## Phase 1 — Owner Approval Flow
- Owner `approvalStatus` states (`pending/approved/rejected`), admin approval/rejection endpoints, admin owners-pending UI.
- Resubmission: rejected owner can edit profile and flip status back to `pending` via `PUT /api/auth/owner/resubmit`.
- `ownerApprovedMiddleware` (DB-checked, no JWT claim) and `ownerApprovedGuard`.
- **Exit check:** new owner signup is blocked from turf creation until an admin account approves them; a rejected owner can correct details and get re-reviewed.

## Phase 2 — Turf Management
- `Turf` model + CRUD (owner), turf listing/detail (public), **Cloudinary image upload** (backend validates MIME type and size, calls Cloudinary signed upload via `upload.service.js`, stores returned secure URL in `Turf.images[]`), admin turf-approval queue (covers first submissions and re-reviews).
- Major/minor edit split: editing address/pricing/sportTypes/operatingHours resets `status` to `pending`; editing photos/amenities/description applies immediately.
- **Exit check:** approved owner can create a turf with images uploaded to Cloudinary, it appears publicly only after admin approval; editing the price knocks it back to pending, editing a photo does not.

## Phase 3 — Slot & Availability + Booking (no payment yet)
- Availability computation (operating hours − existing bookings − blackout dates), on the shared `Booking` collection with its `sourceType` field (built now even though `'tournament'` isn't used until Phase 5).
- Booking creation with the unique-index double-booking guard, exactly-10-minute `pending_payment` TTL, booking states without payment gating (mock "confirm" for now).
- Rate limiting on booking creation.
- Customer booking flow UI, owner booking list.
- **Exit check:** two simultaneous booking attempts for the same slot — only one succeeds; a burst of booking-creation calls from one account gets throttled.

## Phase 4 — Payments (Razorpay only)
- `Settings` collection + `/admin/settings` UI: cancellation/refund policy tiers, platform fee %.
- Razorpay integration: create-order (turf bookings include the current platform fee, tournament entry fees don't), verify, webhook.
- Wire booking confirmation to verified payment; refund endpoint reads the live cancellation policy (no hard-coded refund rule).
- `Payout` ledger entry written on successful turf-booking payment (gross/fee/net/status).
- **Exit check:** booking only becomes `confirmed` after a real (test-mode) payment succeeds; refund amount changes when the admin edits the cancellation policy; a payout ledger entry appears with the correct fee split.

## Phase 5 — Tournaments
- `Tournament`, `Team`, `Match`, `Standing` models.
- Tournament creation (owner), team registration + entry-fee payment (reuse payment service, zero platform fee), bracket/fixture generation service.
- Bracket generation creates a real `Booking` (`sourceType: 'tournament'`) per match, going through the exact same double-booking guard as customer bookings.
- Score entry, standings computation, public tournament pages (bracket view, standings).
- **Exit check:** a full tournament can be created, teams registered and paid (no fee deducted), bracket generated, results entered, standings update correctly — and a customer cannot book a turf/time slot already claimed by a scheduled match, or vice versa.

## Phase 6 — Reviews, Notifications, Admin Analytics & Payouts
- Review model + post-completion review flow.
- **Email notifications** via `notification.service.js` (Nodemailer, SMTP transport configured from env vars — locked decision #20): booking confirmed/cancelled, tournament registration, match schedule reminders, owner approval/rejection. The `sendEmail({ to, subject, html })` interface is used at all call sites; no call site references Nodemailer directly.
- Admin reports dashboard (bookings/revenue over time, active owners/turfs) and admin payout queue (`GET /api/admin/payouts`, mark-paid action); owner-facing payout view.

## Phase 7 — Hardening & Polish
- Apply Doc 09 security checklist end-to-end (rate limiting on bookings and tournament registration, helmet, audit log, input validation pass, password-reset token expiry).
- Basic automated tests around the booking-concurrency (including tournament-vs-customer collisions) and payment-verification logic specifically (highest-risk correctness areas).
- Deployment setup (env separation, CI if desired).
- Visual/UX polish pass against these written docs (no external design file dependency — locked decision #15).

## Suggested working order within each phase
Backend model + endpoint → Postman/manual test → frontend service + page → wire up → exit check. Avoid building full frontend for a phase before its backend endpoints are stable — matches your preference for practical, example-first, complete-chunk delivery rather than constant back-and-forth.
