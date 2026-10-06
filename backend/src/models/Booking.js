const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // ── Source ────────────────────────────────────────────────────────────
    // Phase 3 uses 'customer' only; 'tournament' wired for Phase 5 (bracket.service.js)
    sourceType: {
      type: String,
      enum: ['customer', 'tournament'],
      required: true,
      default: 'customer',
    },

    // ── References ────────────────────────────────────────────────────────
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null when sourceType='tournament'
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null, // null when sourceType='customer'
    },
    turfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: true,
    },

    // ── Slot ──────────────────────────────────────────────────────────────
    date:      { type: Date,   required: true },
    startTime: { type: String, required: true }, // 'HH:mm'
    endTime:   { type: String, required: true }, // 'HH:mm'
    sport:     { type: String, required: true },

    // ── Financials ────────────────────────────────────────────────────────
    // 0 for tournament-match reservations (entry fee is handled via Payment/Team)
    amount: { type: Number, default: 0, min: 0 },

    // ── Status ────────────────────────────────────────────────────────────
    // pending_payment: 10-minute hold while customer pays (locked decision #5)
    // confirmed: payment verified
    // cancelled: customer / owner / admin cancelled
    // completed: slot time has passed
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'cancelled', 'completed'],
      default: 'pending_payment',
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },

    cancelledBy: {
      type: String,
      enum: ['customer', 'owner', 'admin', null],
      default: null,
    },

    cancellationReason: { type: String, default: null },

    // TTL field: set to creation time; a MongoDB TTL index expires
    // pending_payment documents after exactly 10 minutes (Doc 05).
    // Once status changes the document is no longer eligible for TTL deletion.
    pendingExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Critical double-booking guard (Doc 05, locked decision #10) ──────────────
// Unique across { turfId, date, startTime } for all NON-CANCELLED bookings.
// Both sourceType='customer' and sourceType='tournament' compete on this index —
// a tournament match and a customer booking can never share the same turf/time.
bookingSchema.index(
  { turfId: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'cancelled' } },
    name: 'unique_slot_non_cancelled',
  }
);

// Standard query indexes
bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ turfId: 1, date: 1, status: 1 });
bookingSchema.index({ status: 1, pendingExpiresAt: 1 }); // for expiry job

// TTL index on pendingExpiresAt — MongoDB deletes the document when this
// timestamp has passed, ONLY when status is still 'pending_payment'.
// Application-level expiry job ALSO handles this to mark status 'cancelled'
// on active documents before deletion happens.
bookingSchema.index(
  { pendingExpiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_pending_payment' }
);

module.exports = mongoose.model('Booking', bookingSchema);
