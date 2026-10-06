# TurfX — Security Requirements

## Transport & headers
- HTTPS enforced everywhere (HSTS).
- `helmet` middleware for standard security headers.
- CORS restricted to the actual frontend origin(s), not `*`.

## Input handling
- Every request body/query validated server-side (Joi/Zod schemas) — never trust client validation alone.
- MongoDB injection prevention: never build queries from raw unvalidated user input (e.g., `$where`); use Mongoose schema typing and sanitize.
- File upload (turf images) validated for MIME type (`image/jpeg`, `image/png`, `image/webp`) and size limit server-side **before** forwarding to Cloudinary (locked decision #17). The backend never stores image binaries on disk; only the Cloudinary secure URL is persisted. Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are kept in environment variables and never committed to the repo.

## Auth-specific
- Rate limiting on `/api/auth/login`, `/api/auth/register*`, `/api/auth/forgot-password`, `/api/auth/reset-password` to blunt brute-force/credential-stuffing.
- Password reset tokens are single-use and carry a short, fixed expiry; an expired or reused token is rejected outright (locked decision #14).
- JWT secret in environment variables, rotated if ever exposed; never committed to the repo.
- Refresh tokens stored as **httpOnly, Secure, SameSite=Strict cookies** (locked decision #19); consider a CSRF token for any additional state-changing endpoints that rely on the cookie (the refresh endpoint itself is low-risk as it only issues a new access token).
- **Access tokens are stored in memory only** (locked decision #18) — never in `localStorage` or `sessionStorage`. This removes the token from the XSS-accessible storage surface entirely. Angular's default DOM sanitization applies; avoid `innerHTML` binding of any user-generated content as defense-in-depth.
- **Email verification is not in v1** (locked decision #16) — no verify-email tokens to secure or expire.

## Booking & registration abuse protection (locked decision #13)
- Rate limiting on `POST /api/bookings` — bounds how many `pending_payment` holds one account/IP can create in a given window, so slots can't be repeatedly held and abandoned to deny real customers a booking.
- Rate limiting on `POST /api/tournaments/:id/teams` for the same reason on tournament registration.
- The 10-minute `pending_payment` expiry (Doc 05) is the backstop; rate limiting prevents the hold-and-abandon cycle from being repeated fast enough to matter.

## Payments
- **Razorpay is the sole provider** (locked decision #1) — no other gateway's SDK or webhook handling is built.
- Razorpay **webhook signature verification** mandatory — never mark a booking paid based on an unverified client callback.
- Payment amounts (including the current platform-fee percentage from `Settings`) always recomputed/verified server-side from the booking record, never trusted from the client.
- No card/payment credentials ever touch TurfX's own servers — handled entirely by Razorpay's hosted checkout/SDK (PCI-DSS scope stays with Razorpay).

## Authorization
- Role checks AND resource-ownership checks on every mutating endpoint (see Doc 08) — a customer must not be able to cancel someone else's booking by guessing an ID; an owner must not edit another owner's turf.
- `ownerApprovedMiddleware` on all owner write routes, checked against live DB state.

## Data protection
- No plaintext passwords, ever (bcrypt/argon2).
- PII (phone, email) not logged in plaintext application logs.
- Admin actions (approvals, rejections, refund overrides, user deactivation) written to an audit log collection (`who did what to what, when`) for accountability.

## Operational
- Environment-based config (`.env`, never committed) for DB URI, JWT secret, Razorpay keys, Cloudinary credentials, and SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`).
- Least-privilege MongoDB user for the app (no superuser).
- Dependency vulnerability scanning (`npm audit` / equivalent) as part of the build process.
- Error responses to clients should not leak stack traces or internal details in production.
