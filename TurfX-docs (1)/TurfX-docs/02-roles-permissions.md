# TurfX — Roles & Permissions

## Roles
1. **Customer** — books turfs, joins tournaments, reviews.
2. **Turf Owner** — lists/manages turfs, manages bookings & tournaments for own turfs. Has an `isApproved` flag; most write actions are blocked until true.
3. **Admin** — platform-wide oversight, approvals, disputes, analytics.

## Permission Matrix

| Action | Customer | Owner (pending) | Owner (approved) | Admin |
|---|---|---|---|---|
| Browse/search turfs | ✅ | ✅ | ✅ | ✅ |
| Book a slot | ✅ | ❌ | ❌* | ❌* |
| Cancel own booking | ✅ | — | — | ✅ (any) |
| Review a turf | ✅ (post-booking) | ❌ | ❌ | ❌ |
| Create turf listing | ❌ | ❌ (blocked, see approval flow) | ✅ | ❌ |
| Edit/delete own turf | ❌ | — | ✅ | ✅ (moderation) |
| View bookings for own turf | ❌ | — | ✅ | ✅ (all turfs) |
| Create tournament | ❌ | ❌ | ✅ | ❌ |
| Register team for tournament | ✅ | — | — | ❌ |
| Generate bracket / enter scores | ❌ | — | ✅ (own tournament) | ✅ (any, override) |
| Approve/reject Owner accounts | ❌ | — | — | ✅ |
| Approve/reject turf listings | ❌ | — | — | ✅ |
| View platform analytics | ❌ | ❌ | ✅ (own turf only) | ✅ (platform-wide) |
| Manage platform settings (cancellation policy, platform fee %) | ❌ | ❌ | ❌ | ✅ |
| View own payout ledger | ❌ | ❌ | ✅ (own) | ✅ (all) |
| Mark payout as paid | ❌ | ❌ | ❌ | ✅ |
| Issue/override refunds | ❌ | ❌ (can request via admin) | ❌ | ✅ |

\* Owners/Admins are not prevented from having a customer-style account, but the same user account should not both own a turf and book it — treat as separate concerns; an owner wanting to test-book should use a separate customer account.

## Enforcement principle
Every permission above **must be enforced server-side** (Express middleware), not just hidden in the Angular UI. The frontend route guards are a UX convenience, not a security boundary — see Doc 08 and Doc 09.

## Owner approval state machine
```
signup → pending → (Admin approves) → approved
                 → (Admin rejects)  → rejected → (Owner edits profile, resubmits) → pending
```
A `pending` or `rejected` Owner can log in and see their status page (with an edit form when rejected), but all turf-owner write endpoints (`POST/PUT/DELETE /api/turfs`, tournament creation, etc.) return `403` until the **live database record** shows `approvalStatus === 'approved'`. This status is never read from the JWT — see Doc 08.

## Turf approval state machine (separate from owner approval)
```
owner creates turf → pending → (Admin approves) → approved (publicly bookable)
                             → (Admin rejects)   → rejected → (Owner edits, resubmits) → pending
approved turf + MAJOR edit (address/pricing/sport types/hours) → back to pending (unbookable until re-approved)
approved turf + MINOR edit (photos/amenities/description)      → stays approved, applies immediately
```
