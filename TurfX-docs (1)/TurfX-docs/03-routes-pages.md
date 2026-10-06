# TurfX — Page / Route Structure (Angular)

> Per locked decision #15, this document (not the Stitch screenshots) is the source of truth for pages/routes. Build from this directly.

## Public (no auth)
| Route | Page |
|---|---|
| `/` | Landing page — search bar, featured turfs, how it works |
| `/turfs` | Turf listing/search with filters |
| `/turfs/:id` | Turf detail — photos, amenities, pricing, availability, reviews |
| `/tournaments` | Public tournament listing |
| `/tournaments/:id` | Tournament detail — bracket/fixtures, standings, teams |
| `/login` | Login (single form, role detected from account) |
| `/register` | Customer registration |
| `/register/owner` | Turf Owner registration |
| `/forgot-password`, `/reset-password/:token` | Password reset flow |

## Customer (authGuard + roleGuard('customer'))
| Route | Page |
|---|---|
| `/dashboard` | Customer home — upcoming bookings, quick actions |
| `/turfs/:id/book` | Booking flow (slot selection → review → payment) |
| `/bookings` | My bookings list |
| `/bookings/:id` | Booking detail (status, receipt, cancel/reschedule) |
| `/my-teams` | Teams I've registered/captain of |
| `/tournaments/:id/register` | Team registration + entry fee payment |
| `/profile` | Profile & account settings |

## Turf Owner (authGuard + roleGuard('owner'))
| Route | Page | Notes |
|---|---|---|
| `/owner/pending-approval` | Shown instead of dashboard while account `approvalStatus !== 'approved'`; if `rejected`, shows the rejection reason plus an editable form to correct details and resubmit | |
| `/owner/dashboard` | Bookings overview, revenue snapshot, quick links | requires approved |
| `/owner/turfs` | My turf listings | requires approved |
| `/owner/turfs/new` | Create turf | requires approved |
| `/owner/turfs/:id/edit` | Edit turf details, pricing, amenities — UI distinguishes "major" fields (triggers re-review on save) from "minor" fields (saves immediately); see Doc 06 | requires approved |
| `/owner/turfs/:id/pending-review` | Shown for a turf currently in `pending`/`rejected` status (initial submission or after a major edit) | requires approved |
| `/owner/turfs/:id/slots` | Slot/availability & blackout-date config | requires approved |
| `/owner/bookings` | All bookings across my turfs | requires approved |
| `/owner/tournaments` | My tournaments | requires approved |
| `/owner/tournaments/new` | Create tournament | requires approved |
| `/owner/tournaments/:id/manage` | Manage registrations, generate bracket, enter scores | requires approved |
| `/owner/revenue` | Earnings/payout ledger — gross, platform fee deducted, net owed, payout status | requires approved |
| `/owner/profile` | Owner business profile | |

An `ownerApprovedGuard` redirects any `/owner/*` route (except pending-approval and profile) to `/owner/pending-approval` when not approved.

## Admin (authGuard + roleGuard('admin'))
| Route | Page |
|---|---|
| `/admin/dashboard` | Platform KPIs |
| `/admin/owners/pending` | Pending owner approvals queue |
| `/admin/turfs/pending` | Pending turf listing approvals queue |
| `/admin/users` | All users — search/filter/deactivate |
| `/admin/bookings` | All bookings — search, refund/override |
| `/admin/tournaments` | All tournaments — moderation |
| `/admin/reports` | Analytics/reports |
| `/admin/payouts` | Owner payout ledger platform-wide; mark payouts as paid |
| `/admin/settings` | Platform config — cancellation/refund policy tiers, platform fee % (turf bookings only) |

## Shared/error routes
`/unauthorized` (403 page), `/not-found` (404, wildcard `**`).
