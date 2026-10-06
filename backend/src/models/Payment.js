const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // ── References ────────────────────────────────────────────────────────
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null, // null for tournament entry-fee payments
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null, // only for tournament entry payments
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Provider (Razorpay — locked decision #1) ──────────────────────────
    provider: { type: String, default: 'razorpay' },

    // ── Razorpay IDs ──────────────────────────────────────────────────────
    orderId:           { type: String, default: null }, // Razorpay order_id
    razorpayPaymentId: { type: String, default: null }, // returned after payment
    razorpaySignature: { type: String, default: null }, // for verification
    signatureVerified: { type: Boolean, default: false },

    // ── Amounts ───────────────────────────────────────────────────────────
    amount:            { type: Number, required: true, min: 0 },
    // 0 for tournament entry-fee payments (locked decision #6)
    platformFeeAmount: { type: Number, default: 0, min: 0 },
    currency:          { type: String, default: 'INR' },

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
    },

    refundId:     { type: String, default: null },
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
