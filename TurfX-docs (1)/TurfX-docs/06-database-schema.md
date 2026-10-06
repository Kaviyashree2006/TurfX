# TurfX — MongoDB Schema & Relationships

## Collections

### User
```
{
  _id, name, email (unique), passwordHash, phone,
  role: 'customer' | 'owner' | 'admin',
  approvalStatus: 'pending' | 'approved' | 'rejected',   // meaningful for role='owner' only; 'approved' by default for customer/admin
  rejectionReason: String,      // set when rejected; cleared on resubmission
  resubmissionCount: Number,    // optional, for admin visibility into repeat rejections
  isActive: Boolean,
  passwordResetTokenHash: String,   // hashed, null when unused
  passwordResetExpiresAt: Date,     // token is invalid once past this
  createdAt, updatedAt
}
```
Index: unique on `email`. Note: there is a **single** source of truth for owner approval — `approvalStatus`. No separate boolean flag exists on the User document or in the JWT (locked decision #11); `ownerApprovedMiddleware` checks `user.approvalStatus === 'approved'` directly from the DB on every request.

**No `emailVerified` field.** Email verification is not included in v1 (locked decision #16). Do not add this field unless the decision is explicitly reversed.

### Turf
```
{
  _id, ownerId (ref User),
  name, description,
  sportTypes: [String],           // e.g. ['box_cricket','football_turf']
  address: { line1, city, state, pincode },
  location: { type: 'Point', coordinates: [lng, lat] },   // geo index
  images: [String],                // Cloudinary secure URLs (returned by Cloudinary after signed upload via upload.service.js — see Doc 05). Never raw file paths.
  amenities: [String],
  operatingHours: { open: 'HH:mm', close: 'HH:mm' },
  slotDurationMinutes: Number,
  pricing: { base: Number, weekend: Number, peakHours: [{start,end,price}] },
  blackoutDates: [Date],
  status: 'pending' | 'approved' | 'rejected',   // separate approval gate from the owner account's own approvalStatus
  rejectionReason: String,
  ratingAvg: Number, ratingCount: Number,
  createdAt, updatedAt
}
```
Indexes: `{ location: '2dsphere' }`, text index on `name, description`, `{ ownerId: 1 }`.

**Major vs minor edit fields** (drives whether saving an edit resets `status` to `pending`):
- Major (triggers re-review): `address`, `location`, `pricing`, `sportTypes`, `operatingHours`.
- Minor (applies immediately, no status change): `images`, `amenities`, `description`, `name`.
A turf is only publicly listed/bookable when `status === 'approved'`; it can be edited by its owner in any status, but stays unbookable until approval either way.

### Booking
```
{
  _id,
  sourceType: 'customer' | 'tournament',     // NEW — same collection, same unique index, used by both
  customerId (ref User, null when sourceType='tournament'),
  matchId (ref Match, null when sourceType='customer'),   // NEW — links back to the tournament match that reserved this slot
  turfId (ref Turf),
  date: Date, startTime: 'HH:mm', endTime: 'HH:mm',
  sport: String,
  amount: Number,                              // 0 for tournament-match reservations (no separate charge; entry fee is paid via Payment/Team)
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed',
  paymentId (ref Payment, null for tournament-match reservations),
  cancelledBy: 'customer' | 'owner' | 'admin' | null,
  createdAt, updatedAt
}
```
Index: **unique partial** on `{ turfId: 1, date: 1, startTime: 1 }` where `status: { $ne: 'cancelled' }` — this is what makes double-booking structurally impossible, and it applies to `sourceType: 'tournament'` documents exactly the same as `sourceType: 'customer'` ones (locked decision #10). A tournament match and a customer booking compete for the same index entry; whichever is created first wins the slot.
TTL/expiry handling for stale `pending_payment` docs, exactly 10 minutes (see Doc 05).

### Payment
```
{
  _id, bookingId (ref Booking, nullable if it's a tournament entry fee),
  teamId (ref Team, nullable),               // for tournament entry payments
  provider: 'razorpay',            // locked as the only provider — field kept for clarity/future-proofing, not because a second provider is planned
  orderId, paymentId, signatureVerified: Boolean,
  amount,                          // total charged to the customer, inclusive of platform fee for turf bookings
  platformFeeAmount: Number,       // 0 for tournament entry-fee payments (locked decision #6)
  currency,
  status: 'created' | 'paid' | 'failed' | 'refunded',
  refundId, refundAmount: Number,
  createdAt, updatedAt
}
```

### Tournament
```
{
  _id, ownerId (ref User), turfId (ref Turf),
  name, sport, format: 'knockout' | 'round_robin',
  maxTeams, teamSize, entryFee,
  registrationDeadline, startDate,
  status: 'registration_open' | 'registration_closed' | 'in_progress' | 'completed',
  bracketGenerated: Boolean,
  createdAt, updatedAt
}
```

### Team
```
{
  _id, tournamentId (ref Tournament),
  name, captainId (ref User), players: [{ name, phone }],
  paymentId (ref Payment),
  status: 'registered' | 'confirmed' | 'withdrawn',
  createdAt
}
```

### Match
```
{
  _id, tournamentId (ref Tournament), round: Number,
  team1Id (ref Team), team2Id (ref Team),
  bookingId (ref Booking),        // NEW — the actual slot reservation on the turf; created via booking.service.js
                                   // when the match is scheduled, so it's protected by the same unique index as
                                   // customer bookings (locked decision #10). scheduledAt/turf/time live on the Booking.
  score: { team1: Number, team2: Number },
  winnerId (ref Team),
  status: 'scheduled' | 'completed' | 'walkover',
  createdAt, updatedAt
}
```

### Standing (derived, but stored for round-robin performance)
```
{
  _id, tournamentId (ref Tournament), teamId (ref Team),
  played, won, lost, drawn, points,
  updatedAt
}
```
Recomputed/updated whenever a `Match` for that tournament is marked completed.

### Review
```
{
  _id, turfId (ref Turf), customerId (ref User), bookingId (ref Booking),
  rating: Number (1-5), comment: String,
  createdAt
}
```
Constraint (enforced in service layer): one review per `(customerId, bookingId)`, and only after `Booking.status === 'completed'`.

### Payout *(new — locked decision #12)*
```
{
  _id, ownerId (ref User), turfId (ref Turf), bookingId (ref Booking), paymentId (ref Payment),
  grossAmount: Number,
  platformFeeAmount: Number,
  netAmount: Number,              // grossAmount - platformFeeAmount; what's owed to the owner
  payoutStatus: 'unpaid' | 'paid',
  paidAt: Date,                   // set when Admin marks it paid
  createdAt
}
```
One entry per completed, paid turf booking. Tournament entry-fee payments also get an entry for bookkeeping consistency, with `platformFeeAmount: 0` and `netAmount === grossAmount`. Index: `{ ownerId: 1, payoutStatus: 1 }` for the owner revenue view and admin payout queue.

### Settings *(new — locked decision #4/#6, single-document collection)*
```
{
  _id,
  cancellationPolicy: [
    { hoursBeforeSlot: Number, refundPercent: Number }   // e.g. [{hoursBeforeSlot: 24, refundPercent: 100}, {hoursBeforeSlot: 2, refundPercent: 50}, {hoursBeforeSlot: 0, refundPercent: 0}]
  ],
  platformFeePercent: Number,     // applied to turf bookings only, per locked decision #6
  updatedBy (ref User),           // last admin to change it
  updatedAt
}
```
Read by `settings.service.js` at cancellation/refund time and at booking-payment time; never hard-coded in application logic. Expect exactly one document in this collection.

## Relationship summary
```
User(owner) ──1:N──> Turf ──1:N──> Booking ──1:1──> Payment ──1:1──> Payout
User(customer) ──1:N──> Booking (sourceType='customer')
Turf ──1:N──> Tournament ──1:N──> Team ──N:1──> User(captain)
Tournament ──1:N──> Match (references two Teams) ──1:1──> Booking (sourceType='tournament')
Tournament ──1:N──> Standing (one per Team)
Turf ──1:N──> Review ──N:1──> User(customer), ──1:1──> Booking
Settings — single document, read by booking/payment services (no relationships)
```
