const mongoose = require('mongoose');

/**
 * Review — Phase 6.
 * One review per completed booking. Duplicate prevented by unique index on bookingId.
 * Turf ratingAvg + ratingCount are denormalised on the Turf document and updated
 * by the review service after every create/update/delete.
 */
const reviewSchema = new mongoose.Schema(
  {
    turfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '', maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per booking — enforced at DB level
reviewSchema.index({ bookingId: 1 }, { unique: true, name: 'unique_review_per_booking' });

// Fast lookups by turf (public reviews list) and by customer (my reviews)
reviewSchema.index({ turfId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
