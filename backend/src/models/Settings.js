const mongoose = require('mongoose');

// Single-document collection (Doc 06, locked decision #4/#6).
// Admin edits via /api/admin/settings.
// booking.service.js reads this at booking/cancellation time via settings.service.js.
const settingsSchema = new mongoose.Schema(
  {
    // Ordered tiers: most restrictive last (smallest hoursBeforeSlot first).
    // If cancellation is within X hours before the slot start, refund = refundPercent%.
    cancellationPolicy: {
      type: [
        {
          hoursBeforeSlot: { type: Number, required: true },
          refundPercent:   { type: Number, required: true, min: 0, max: 100 },
          _id: false,
        },
      ],
      default: [
        { hoursBeforeSlot: 24, refundPercent: 100 },
        { hoursBeforeSlot: 2,  refundPercent: 50  },
        { hoursBeforeSlot: 0,  refundPercent: 0   },
      ],
    },

    // Applied to turf booking payments only (locked decision #6).
    // Tournament entry fees carry no platform fee in v1.
    platformFeePercent: { type: Number, default: 5, min: 0, max: 100 },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
