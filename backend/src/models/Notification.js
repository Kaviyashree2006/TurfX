const mongoose = require('mongoose');

/**
 * Notification — Phase 6.
 * Simple in-app notifications. Created server-side on key events.
 * Events: booking_confirmed, tournament_registered, tournament_cancelled.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['booking_confirmed', 'tournament_registered', 'tournament_cancelled'],
    },
    title:   { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    // Optional deep-link reference so the frontend can navigate
    refId:   { type: String, default: null }, // booking id, tournament id, etc.
    refType: { type: String, enum: ['booking', 'tournament'], default: null },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
