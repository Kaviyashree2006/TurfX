const mongoose = require('mongoose');

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const peakHourSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // 'HH:mm'
    end:   { type: String, required: true }, // 'HH:mm'
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    base:      { type: Number, required: true, min: 0 },
    weekend:   { type: Number, default: null },
    peakHours: { type: [peakHourSchema], default: [] },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    line1:   { type: String, trim: true, default: '' },
    city:    { type: String, trim: true, default: '' },
    state:   { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const operatingHoursSchema = new mongoose.Schema(
  {
    open:  { type: String, default: '06:00' }, // 'HH:mm'
    close: { type: String, default: '22:00' }, // 'HH:mm'
  },
  { _id: false }
);

// ── Main schema ──────────────────────────────────────────────────────────────

const turfSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Identity ──────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Turf name is required.'],
      trim: true,
      maxlength: [120, 'Turf name must be 120 characters or fewer.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description must be 2000 characters or fewer.'],
    },

    // ── Sport types ───────────────────────────────────────────────────────
    sportTypes: {
      type: [String],
      enum: ['box_cricket', 'football_turf', 'badminton', 'basketball', 'tennis', 'cricket', 'other'],
      required: [true, 'At least one sport type is required.'],
    },

    // ── Location ──────────────────────────────────────────────────────────
    address: { type: addressSchema, default: () => ({}) },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },

    // ── Media ─────────────────────────────────────────────────────────────
    // Cloudinary secure URLs (Doc 06 — never raw file paths)
    images: { type: [String], default: [] },

    // ── Facilities ────────────────────────────────────────────────────────
    amenities: { type: [String], default: [] },

    // ── Schedule ──────────────────────────────────────────────────────────
    operatingHours: { type: operatingHoursSchema, default: () => ({}) },
    slotDurationMinutes: { type: Number, default: 60, min: 30, max: 240 },
    blackoutDates: { type: [Date], default: [] },

    // ── Pricing ───────────────────────────────────────────────────────────
    pricing: {
      type: pricingSchema,
      required: true,
      default: () => ({ base: 0, weekend: null, peakHours: [] }),
    },

    // ── Approval (separate from owner account approval — Doc 06) ─────────
    // 'pending' on creation, 'approved' after admin review, 'rejected' if declined.
    // Major edits reset an approved turf back to 'pending' (Doc 05).
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },

    // ── Visibility (owner can disable a turf without deleting it) ─────────
    isActive: { type: Boolean, default: true },

    // ── Ratings (denormalised for query performance) ───────────────────────
    ratingAvg:   { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
turfSchema.index({ location: '2dsphere' });
turfSchema.index({ name: 'text', description: 'text' });
turfSchema.index({ ownerId: 1 });
turfSchema.index({ status: 1, isActive: 1 }); // for public listing filter

// ── Major-field constant (Doc 06 / Doc 05) ───────────────────────────────────
// Changing any of these on an APPROVED turf resets status → 'pending'.
turfSchema.statics.MAJOR_FIELDS = ['address', 'location', 'pricing', 'sportTypes', 'operatingHours'];

module.exports = mongoose.model('Turf', turfSchema);
