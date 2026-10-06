const mongoose = require('mongoose');

/**
 * Tournament — Phase 5.
 * Owned by a turf owner; customers register via TournamentRegistration.
 */
const tournamentSchema = new mongoose.Schema(
  {
    turfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: {
      type: String,
      required: [true, 'Tournament name is required.'],
      trim: true,
      maxlength: [120, 'Name must be 120 characters or fewer.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description must be 2000 characters or fewer.'],
    },
    sport: {
      type: String,
      required: [true, 'Sport is required.'],
      enum: ['box_cricket', 'football_turf', 'badminton', 'basketball', 'tennis', 'cricket', 'other'],
    },

    date:      { type: String, required: true }, // 'YYYY-MM-DD'
    startTime: { type: String, required: true }, // 'HH:mm'
    endTime:   { type: String, required: true }, // 'HH:mm'

    maxParticipants: { type: Number, required: true, min: 2, max: 500 },
    entryFee:        { type: Number, default: 0, min: 0 },
    prizeInfo:       { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

tournamentSchema.index({ turfId: 1, date: 1 });
tournamentSchema.index({ ownerId: 1 });
tournamentSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
