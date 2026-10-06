const Joi = require('joi');

// ── Reusable pieces ───────────────────────────────────────────────────────────

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm

const peakHourSchema = Joi.object({
  start: Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': 'Peak hour start must be HH:mm format.',
  }),
  end: Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': 'Peak hour end must be HH:mm format.',
  }),
  price: Joi.number().min(0).required(),
});

const pricingSchema = Joi.object({
  base:      Joi.number().min(0).required().messages({ 'number.min': 'Base price cannot be negative.' }),
  weekend:   Joi.number().min(0).allow(null).default(null),
  peakHours: Joi.array().items(peakHourSchema).default([]),
});

const addressSchema = Joi.object({
  line1:   Joi.string().trim().max(200).allow('').default(''),
  city:    Joi.string().trim().max(100).allow('').default(''),
  state:   Joi.string().trim().max(100).allow('').default(''),
  pincode: Joi.string().trim().max(20).allow('').default(''),
});

const operatingHoursSchema = Joi.object({
  open:  Joi.string().pattern(timePattern).default('06:00'),
  close: Joi.string().pattern(timePattern).default('22:00'),
});

const validSportTypes = ['box_cricket', 'football_turf', 'badminton', 'basketball', 'tennis', 'cricket', 'other'];

// ── Create turf ───────────────────────────────────────────────────────────────
const createTurfSchema = Joi.object({
  name:        Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().max(2000).allow('').default(''),
  sportTypes:  Joi.array().items(Joi.string().valid(...validSportTypes)).min(1).required().messages({
    'array.min': 'At least one sport type is required.',
  }),
  address:        addressSchema.default({}),
  location:       Joi.object({
    type:        Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).default([0, 0]),
  }).default({ type: 'Point', coordinates: [0, 0] }),
  amenities:      Joi.array().items(Joi.string().trim()).default([]),
  operatingHours: operatingHoursSchema.default({}),
  slotDurationMinutes: Joi.number().integer().min(30).max(240).default(60),
  pricing:        pricingSchema.required(),
});

// ── Update turf (all fields optional — partial update) ────────────────────────
const updateTurfSchema = Joi.object({
  name:        Joi.string().trim().min(2).max(120),
  description: Joi.string().trim().max(2000).allow(''),
  sportTypes:  Joi.array().items(Joi.string().valid(...validSportTypes)).min(1),
  address:     addressSchema,
  location:    Joi.object({
    type:        Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2),
  }),
  amenities:      Joi.array().items(Joi.string().trim()),
  operatingHours: operatingHoursSchema,
  slotDurationMinutes: Joi.number().integer().min(30).max(240),
  pricing:        pricingSchema,
}).min(1).messages({ 'object.min': 'At least one field must be provided for update.' });

// ── Admin reject turf ─────────────────────────────────────────────────────────
const rejectTurfSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(10).max(500).required().messages({
    'string.min': 'Rejection reason must be at least 10 characters.',
    'any.required': 'A rejection reason is required.',
  }),
});

module.exports = { createTurfSchema, updateTurfSchema, rejectTurfSchema };
