# TurfX — Feature Requirements

## 1. Authentication & Onboarding
- Customer signup/login (email + password), JWT-based sessions.
- Turf Owner signup — separate registration flow, account created in **pending** state.
- Admin accounts are not self-registered; seeded/created manually.
- Password reset via email link.
- (Optional, confirm) Email verification on signup.

## 2. Turf Owner Onboarding & Approval
- Owner submits business/profile details on signup.
- Owner cannot list turfs or receive bookings until Admin approves the account.
- Owner sees a "pending approval" screen/state until approved.
- Admin can approve or reject with a reason; rejection notifies the owner.
- **Rejection is not terminal**: a rejected owner can edit their submitted profile/business details and resubmit for Admin review, returning to the pending state.

## 3. Turf / Venue Management (Owner)
- Create/edit/delete turf listings: name, description, sport types (turf football, box cricket, etc.), address + map location, images, amenities (lighting, parking, washroom, etc.), operating hours.
- Each new turf listing also starts **pending** and requires its own Admin approval before appearing publicly — separate from, and in addition to, the owner account's approval.
- Pricing: per-hour base rate, optional peak/off-peak pricing, optional weekday/weekend pricing.
- Slot configuration: slot duration (e.g., 30/60 min), blackout dates/maintenance windows.
- **Editing an approved turf**: edits are split into two tiers.
  - *Major* fields (address/location, pricing structure, sport types, operating hours) — saving a change resets the turf to `pending` and it's unbookable until Admin re-approves.
  - *Minor* fields (photos, amenities list, text description) — save and apply immediately, no re-review.

## 4. Turf Discovery (Customer)
- Browse/search turfs with filters: sport type, location/distance, price range, rating, availability date.
- Turf detail page: photos, amenities, pricing, reviews, live availability calendar.
- Map view (uses turf geo-location).

## 5. Booking Engine
- Customer selects date + slot(s) on a turf's availability calendar.
- System prevents double-booking of the same turf/date/time (hard constraint at DB level).
- Booking held for **exactly 10 minutes** while payment completes, then automatically released if payment fails/times out.
- Booking states: `pending_payment → confirmed → completed` or `→ cancelled`.
- Cancellation by customer, governed by an **Admin-configurable cancellation/refund policy** (e.g. refund tiers by hours-before-slot) rather than a hard-coded rule — Admin edits the policy values in `/admin/settings`, the booking service reads them at cancellation time.
- **No reschedule feature.** A customer who wants a different slot cancels the existing booking (per the refund policy above) and creates a new booking. There is no separate reschedule flow.
- Owner can view/manage bookings for their own turfs; cannot see other owners' bookings.
- A tournament match reserves a turf slot through the **same booking mechanism and the same double-booking guard** as a normal customer booking (see Doc 06/07) — a match and a customer booking can never occupy the same turf/time.

## 6. Payments
- **Razorpay only** (locked decision — no Stripe) for booking payments and tournament entry fees.
- Order creation → client-side payment → server-side signature verification → booking/registration confirmed only after verified payment.
- Webhook handling for async payment/refund events.
- Refunds triggered on eligible cancellations (customer-initiated within the Admin-configured policy, or owner/admin-initiated).
- **Platform fee**: a percentage, configurable by Admin, applied to turf booking payments only in v1. Tournament entry fees are **not** fee'd in v1 — the organizing owner receives the full entry fee amount. (Revisit for a future version.)
- **Payout/Ledger tracking**: every completed booking payment creates a ledger entry recording the gross amount, the platform fee taken, the net amount owed to the owner, and a payout status (`unpaid`/`paid`). Actual bank transfer to owners remains manual/offline in v1 — this just gives Admin and Owner an accurate running total. See Doc 06 for the `Payout` collection.

## 7. Tournament Management
- Owner (at their approved turf) creates a tournament: name, sport, format (knockout / round-robin), team size, max teams, entry fee, registration window, start date, venue (own turf).
- Every scheduled match **creates a real slot reservation on the owner's turf using the same booking/availability mechanism as customer bookings** — so match times can't silently collide with a customer booking on that turf, and vice versa.
- Entry fees are collected via Razorpay like bookings, but carry **no platform fee in v1** (see Payments section above).
- Customers register a team (as captain) and pay entry fee.
- Once registration closes, Owner triggers bracket/fixture generation:
  - Knockout: seeded/random bracket, single elimination.
  - Round-robin: full fixture list, points table.
- Match results entry (score, winner) by Owner (or delegated referee role — out of scope for v1 unless requested).
- Standings auto-computed from match results.
- Public tournament page: bracket/fixtures, standings, teams.

## 8. Reviews & Ratings
- Customer can rate/review a turf only after a completed booking there.
- Turf average rating shown on listing and detail page.
- Owner can respond to a review (optional nice-to-have).

## 9. Notifications
- Booking confirmation, cancellation, tournament registration confirmation, match schedule reminders.
- Channel: email in v1 *(SMS/WhatsApp — confirm need, see Doc 00)*.

## 10. Admin Console
- Approve/reject Owner accounts (with resubmission support) and turf listings (initial + re-review after major edits).
- View/manage all users, bookings, tournaments platform-wide.
- Override cancellations/refunds in disputes.
- View owner payout ledger platform-wide; mark payouts as paid.
- Basic analytics: bookings over time, revenue, active turfs/owners, tournament participation.
- **Platform settings screen** — the actual configuration surface for: cancellation/refund policy tiers, platform fee percentage (turf bookings only). These are stored in a `Settings` collection and read at runtime, never hard-coded.

## Explicitly out of scope for v1 (flag if wrong)
- Live match streaming/commentary.
- In-app chat between customer and owner.
- Referee/scorer role separate from Owner.
- Owner payout automation (bank transfer integration) — v1 tracks the ledger only, transfer stays manual/offline.
- Platform fee on tournament entry fees.
- Multi-currency/multi-language support.
- Stripe or any payment provider other than Razorpay.
