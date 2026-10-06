# TurfX — Project Overview

**What it is:** A Turf, Box Cricket & Tournament Management Platform.

**Stack:** Angular (frontend) · Node.js + Express.js (backend) · MongoDB (database) · JWT (auth)

**Roles:** Customer · Turf Owner · Admin

## Locked product decisions (final — do not revisit without a deliberate change request)
1. **Payment provider: Razorpay.** All payment code targets Razorpay's API/webhooks only.
2. **Owner accounts require Admin approval** before the owner can list turfs or receive bookings.
3. **Each turf listing also requires its own, separate Admin approval** before it becomes publicly bookable — this is in addition to, not instead of, owner-account approval.
4. **Cancellation/refund rules are Admin-configurable**, not hard-coded — stored in a platform `Settings` collection (see Doc 06), editable via `/admin/settings`.
5. **Pending-payment booking hold duration is exactly 10 minutes** — fixed value, not configurable in v1.
6. **Platform fee**: a percentage applied to turf bookings only in v1. Tournament entry fees carry no platform fee in v1 (owner keeps 100% of entry fees) — revisit post-v1.
7. **Major vs minor turf edits**: changing address, pricing structure, or other "important listing details" on an already-approved turf resets it to pending re-review. Minor edits (e.g. photo swap, amenity list tweak, description wording) apply immediately with no re-review. See Doc 06 for the exact field split.
8. **No reschedule feature in v1.** Customers cancel (subject to the configurable refund policy) and create a new booking. There is no dedicated reschedule endpoint or UI flow.
9. **Rejected owners can correct and resubmit.** Rejection is not terminal — an owner can edit their profile and resubmit for Admin review.
10. **Tournament matches use the exact same turf/time availability protection as customer bookings.** A tournament match reserves a real slot through the same booking mechanism (unique-index guard), so a customer booking and a tournament match can never double-book the same turf/time.
11. **JWT access tokens never carry `isApproved`.** Owner-approval status is always checked live against the database in middleware.
12. **A Payout/Ledger model tracks owner earnings, platform fees, and payout status** (see Doc 06).
13. **Rate limiting/abuse protection applies to booking creation and tournament team registration**, not just auth endpoints.
14. **Password reset tokens have both an expiry and rate limiting** on the request/reset endpoints.
15. **Stitch screenshots are not required.** These written requirements and architecture documents are the sole source of truth for the UI/UX. Any future design files are a nice-to-have visual reference, not a dependency for starting development.
16. **Email verification is not included in v1.** User accounts (customer and owner) are active immediately after registration without email confirmation. Revisit post-v1.
17. **Image storage: Cloudinary.** Turf images are uploaded directly to Cloudinary from the backend (signed upload). The `images` field on the `Turf` collection stores Cloudinary URLs. MIME type and size validation happens server-side before the upload is forwarded to Cloudinary.
18. **Access token storage: in-memory only.** The Angular app holds the JWT access token in a module-level variable (never `localStorage` or `sessionStorage`). On page reload, the app silently calls `/api/auth/refresh` using the httpOnly refresh-token cookie to recover the session. This eliminates the token from the XSS-accessible storage surface.
19. **Refresh token: httpOnly, Secure, SameSite=Strict cookie.** Stored server-side (hashed) per user/device for revocation support. This decision is paired with decision #18.
20. **Email provider: Nodemailer with SMTP.** The `notification.service.js` wraps Nodemailer but exposes an abstract interface (`sendEmail({ to, subject, html })`). The SMTP transport is configured entirely via environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), so the underlying provider (Gmail, SendGrid SMTP, Mailgun, etc.) can be swapped without touching call sites.

## Document index
| # | File | Contents |
|---|------|----------|
| 1 | 01-feature-requirements.md | Full feature list by module |
| 2 | 02-roles-permissions.md | Role definitions + permission matrix |
| 3 | 03-routes-pages.md | Angular route/page structure |
| 4 | 04-frontend-architecture.md | Angular app architecture |
| 5 | 05-backend-architecture.md | Node/Express app architecture |
| 6 | 06-database-schema.md | MongoDB collections + relationships |
| 7 | 07-api-structure.md | REST API endpoint list |
| 8 | 08-auth-design.md | Auth & authorization design |
| 9 | 09-security-requirements.md | Security checklist |
| 10 | 10-implementation-plan.md | Phased build plan |

No code has been written yet, per your instruction — these are planning/architecture documents only, meant to be opened in Kiro to drive implementation. All 20 decisions above are final for v1; the rest of this document set has been updated to be consistent with them.
