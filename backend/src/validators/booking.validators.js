const Joi = require('joi');

const datePattern = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm

const createBookingSchema = Joi.object({
  turfId:    Joi.string().trim().required().messages({ 'any.required': 'Turf ID is required.' }),
  date:      Joi.string().pattern(datePattern).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format.',
    'any.required': 'Date is required.',
  }),
  startTime: Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': 'Start time must be in HH:mm format.',
    'any.required': 'Start time is required.',
  }),
  sport: Joi.string().trim().min(2).max(50).required(),
});

const cancelBookingSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional().allow('', null),
});

module.exports = { createBookingSchema, cancelBookingSchema };
