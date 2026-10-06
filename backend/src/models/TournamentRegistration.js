const mongoose = require('mongoose');

/**
 * TournamentRegistration — Phase 5.
 * One document per customer per tournament.
 * The compound unique index enforces duplicate-registration prevention at DB level.
 */
const registrationSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: phone number customer provides at registration time
    phone: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Compound unique index — prevents duplicate registrations at DB level
registrationSchema.index(
  { tournamentId: 1, userId: 1 },
  { unique: true, name: 'unique_registration' }
);

registrationSchema.index({ userId: 1 }); // for "my registrations" query

module.exports = mongoose.model('TournamentRegistration', registrationSchema);
