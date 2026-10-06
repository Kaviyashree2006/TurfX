# TurfX — Node.js / Express Backend Architecture

## Folder structure
```
src/
  config/          db.js, env.js, razorpay.js, cloudinary.js
  models/          User.js, Turf.js, Booking.js, Payment.js, Tournament.js, Team.js, Match.js, Review.js, Payout.js, Settings.js
  controllers/     auth.controller.js, turf.controller.js, booking.controller.js,
                   payment.controller.js, tournament.controller.js, admin.controller.js
  routes/          auth.routes.js, turf.routes.js, booking.routes.js,
                   payment.routes.js, tournament.routes.js, admin.routes.js
  middlewares/     auth.middleware.js (verify JWT), role.middleware.js,
                   ownerApproved.middleware.js, error.middleware.js, validate.middleware.js
  services/        booking.service.js (slot-lock logic, shared by customer bookings AND tournament matches),
                   payment.service.js (Razorpay wrapper), bracket.service.js (bracket/fixture generation,
                   calls booking.service to reserve each match's slot), payout.service.js (ledger entries,
                   platform-fee calculation), settings.service.js (cancellation policy + platform fee %,
                   read from DB, cached briefly), notification.service.js (Nodemailer/SMTP, abstract sendEmail interface),
                   upload.service.js (Cloudinary signed upload/delete)
  validators/      Joi/Zod schemas per resource
  utils/           apiResponse.js, asyncHandler.js
  app.js
  server.js
```

## Layering
Controller → Service → Model. Controllers stay thin (parse request, call service, send response); business logic (slot-locking, bracket generation, payment verification) lives in services so it's unit-testable without HTTP.

## Booking concurrency (the critical correctness issue)
Double-booking must be impossible even under concurrent requests — and this applies identically to customer bookings and tournament matches, since both go through the same mechanism:
- MongoDB unique compound index on `{ turfId, date, startTime }` scoped to non-cancelled bookings (partial index with `status: { $ne: 'cancelled' }`).
- Booking creation wrapped in a MongoDB transaction: create booking with `pending_payment` status → attempt insert → if duplicate-key error, return "slot no longer available" immediately.
- A lightweight expiry job (cron or `setTimeout`-based, or MongoDB TTL index on `pending_payment` bookings) releases holds that never complete payment within **exactly 10 minutes** (locked value, not configurable).
- **Tournament matches reserve their slot through `booking.service.js` the same way a customer booking does** — `bracket.service.js` creates a `Booking` document (linked to the `Match` via `sourceType: 'tournament'`, `matchId`) for every scheduled match, so it competes for the same unique index and a customer can never book a turf/time already claimed by a match, or vice versa.

## Turf edit re-review logic
`turf.service.js` compares the incoming update against the stored document: if any of `address`, `location`, `pricing`, `sportTypes`, or `operatingHours` changed, the turf's `status` is set back to `pending` (unbookable, requires Admin approval) regardless of what else changed in the same request. Any other field (photos, amenities, description) updates in place with no status change.

## Payment flow (Razorpay — locked as the sole provider)
1. `POST /api/payments/create-order` — server creates a Razorpay order for the booking amount (booking amount includes the platform fee already added/deducted per `settings.service.js`'s current fee %; tournament entry-fee orders skip the fee entirely), returns `order_id` to frontend.
2. Frontend opens Razorpay Checkout with `order_id`.
3. `POST /api/payments/verify` — frontend sends payment_id/order_id/signature; **server verifies signature server-side** before marking booking `confirmed`. Never trust a client-side "success" callback alone.
4. `POST /api/payments/webhook` — Razorpay webhook as a backup confirmation path (in case client never calls verify, e.g. tab closed). Webhook signature verified via Razorpay webhook secret.
5. Refunds: `POST /api/bookings/:id/refund` (Owner/Admin) or auto-triggered on customer cancellation → `booking.service.js` reads the current cancellation/refund policy from `settings.service.js` (hours-before-slot tiers, refund %), computes the refund amount, calls the Razorpay refund API, updates `Payment.status`. No refund percentage or window is hard-coded in application logic.
6. On successful payment for a turf booking, `payout.service.js` writes a `Payout` ledger entry: gross amount, platform-fee amount (from current settings), net amount owed to the owner, status `unpaid`. Tournament entry-fee payments write a ledger entry with platform fee = 0.

## Tournament bracket generation
`bracket.service.js` takes the list of registered teams (post registration-deadline) and:
- Knockout: shuffles/seeds teams, generates round-by-round match tree, byes if team count isn't a power of 2.
- Round-robin: generates all pairwise fixtures, initializes a standings table (played/won/lost/points).
Regenerating a bracket after it's been generated should be blocked once any match has a recorded result (data integrity).

## Authorization enforcement (backend is the real boundary)
Every protected route runs: `auth.middleware` (valid JWT) → `role.middleware(['owner'])` (correct role) → `ownerApproved.middleware` (for owner write routes) → controller. Resource-ownership checks (e.g., "is this turf mine?") happen inside the controller/service, not just role checks. `ownerApproved.middleware` **always queries the `User` document for the current `approvalStatus`** — the JWT carries no approval claim (locked decision #11), so there is nothing to trust or distrust in the token on this point.

## Rate limiting / abuse protection
Beyond the auth endpoints, rate limiting is required on:
- `POST /api/bookings` — caps how many `pending_payment` holds a single account (and/or IP) can create per minute, so a slot can't be repeatedly held-and-abandoned to lock out real customers.
- `POST /api/tournaments/:id/teams` — same concern for tournament registration slots.
- `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` — see password-reset note below.

## Password reset
Reset tokens are single-use, cryptographically random, and **expire after a short fixed window** (e.g. 30–60 minutes — exact value is an implementation detail, not a locked product decision). `forgot-password` and `reset-password` endpoints are both rate-limited per account/IP to prevent enumeration and brute-force of the reset token.

## Error handling & logging
- Central `error.middleware.js` returns consistent JSON error shape `{ success: false, message, code }`.
- Structured request logging (e.g., morgan for access logs); avoid logging PII/payment secrets.

## Image storage (Cloudinary — locked decision #17)
Turf images are stored on Cloudinary, not on the local filesystem or a generic S3 bucket. The upload flow:
1. The owner POSTs image files to the backend (multipart/form-data).
2. `turf.service.js` (or a dedicated `upload.service.js`) validates MIME type (`image/jpeg`, `image/png`, `image/webp`) and file size (max configurable in env, e.g. 5 MB) **before** forwarding to Cloudinary.
3. The backend uses the Cloudinary Node SDK with a **signed upload** (credentials in env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
4. Cloudinary returns a secure URL, which is stored in `Turf.images[]`. No binary data is persisted on the TurfX server.
5. Image deletion (on turf edit/delete) calls the Cloudinary destroy API using the stored public ID embedded in the URL.
`config/cloudinary.js` initialises the SDK once from env vars; all image operations go through it.

## Notifications
`notification.service.js` exposes a **provider-agnostic interface**: `sendEmail({ to, subject, html })`. The implementation uses **Nodemailer** with an SMTP transport configured entirely from environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`). Switching to a different SMTP provider (Gmail, SendGrid SMTP relay, Mailgun, etc.) requires only env-var changes — no call-site modifications. SMS/WhatsApp can be added later as additional transport methods behind the same interface without touching existing callers.
