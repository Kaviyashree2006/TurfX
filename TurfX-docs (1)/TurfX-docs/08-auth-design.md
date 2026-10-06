# TurfX — Authentication & Authorization Design

## Tokens
- **Access token**: JWT, short-lived (~15 min), contains `{ userId, role }` only — **no `isApproved` claim** (locked decision #11). Owner-approval status is never encoded in the token; it's looked up from the database on every request that needs it. Sent in `Authorization: Bearer` header on every authenticated request. **Stored in memory only** (a module-level variable in `TokenService`) — never written to `localStorage` or `sessionStorage` (locked decision #18). This eliminates the token from the XSS-accessible browser storage surface entirely. On a full page reload the Angular app calls `/api/auth/refresh` immediately on startup; a valid refresh-token cookie silently restores the session without the user re-authenticating.
- **Refresh token**: longer-lived (~7 days), issued as an **httpOnly, Secure, SameSite=Strict cookie** (locked decision #19) — not readable by JavaScript under any circumstances. Used only to hit `/api/auth/refresh` and mint a new access token. The cookie is sent automatically by the browser on that endpoint; no JavaScript code reads or forwards it.
- Refresh tokens are stored **hashed** server-side per user/device so they can be revoked individually (logout, logout-all-devices) or globally on password change.

## Password handling
- bcrypt (or argon2) hashing, never store plaintext.
- Minimum password policy enforced client- and server-side.
- **Password reset**: token is single-use, stored hashed (`passwordResetTokenHash`), carries a short fixed expiry (`passwordResetExpiresAt`) — an expired or already-consumed token is rejected outright. Both `forgot-password` and `reset-password` endpoints are rate-limited per account/IP (locked decision #14).

## Role & approval checks (Express middleware chain)
```
router.post('/turfs', authMiddleware, roleMiddleware(['owner']), ownerApprovedMiddleware, turfController.create)
```
- `authMiddleware` — verifies JWT signature/expiry, attaches `req.user`.
- `roleMiddleware([...])` — checks `req.user.role` is in the allowed list.
- `ownerApprovedMiddleware` — for owner-only write routes, **looks up the current `User` document and checks `approvalStatus === 'approved'`**, else `403 { code: 'OWNER_NOT_APPROVED' }`. There is no JWT claim to check — this is the only source of truth.
- Ownership checks (e.g. "is this turf mine?") happen in the controller against the resource's `ownerId`/`customerId` — role middleware alone is not enough for resource-level access.

## Frontend guards (UX layer, not security layer)
- `authGuard` — redirects to `/login` if no valid session.
- `roleGuard(['owner'])` — redirects to `/unauthorized` if role mismatch.
- `ownerApprovedGuard` — redirects to `/owner/pending-approval` if not approved.
- These exist so users don't hit dead-end UI, but **every one of them is redundant with, and secondary to, the backend middleware** — the API must reject unauthorized calls regardless of what the Angular app allows to render.

## Session lifecycle
1. Login → access token returned **in the response body** (stored in memory by `TokenService`) + refresh token set as an **httpOnly, Secure, SameSite=Strict cookie** by the server.
2. Page reload → `AuthService` calls `/api/auth/refresh` at app startup; the browser sends the cookie automatically; if valid, a new access token is returned in the response body and stored in memory. If the cookie is absent or expired, the user is redirected to `/login`.
3. Access token expires mid-session → `jwtInterceptor` catches `401`, calls `/api/auth/refresh` (cookie sent automatically), stores the new access token in memory, retries the original request once.
4. Refresh token itself expired/invalid → force logout, clear in-memory token, redirect to `/login`.
5. Logout → clear in-memory access token client-side, call `/api/auth/logout` to revoke the refresh token server-side (server clears the cookie and removes the hashed token from the DB).

## Owner-approval interaction with auth (locked)
Approval status is **never** encoded in the access token. `ownerApprovedMiddleware` always queries the live `User` document. This costs one extra DB lookup per owner write request, which is an acceptable trade for approval status never being stale — an admin rejecting or approving an owner takes effect on that owner's very next request, not on their next token refresh.
