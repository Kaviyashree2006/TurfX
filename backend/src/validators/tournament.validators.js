const Joi = require('joi');

const datePattern  = /^\d{4}-\d{2}-\d{2}$/;
const timePattern  = /^([01]\d|2[0-3]):([0-5]\d)$/;
const sportValues  = ['box_cricket', 'football_turf', 'badminton', 'basketball', 'tennis', 'cricket', 'other'];

const createTournamentSchema = Joi.object({
  turfId:          Joi.string().required(),
  name:            Joi.string().trim().min(3).max(120).required(),
  description:     Joi.string().trim().max(2000).allow('').default(''),
  sport:           Joi.string().valid(...sportValues).required(),
  date:            Joi.string().pattern(datePattern).required()
                     .messages({ 'string.pattern.base': 'date must be YYYY-MM-DD.' }),
  startTime:       Joi.string().pattern(timePattern).required()
                     .messages({ 'string.pattern.base': 'startTime must be HH:mm.' }),
  endTime:         Joi.string().pattern(timePattern).required()
                     .messages({ 'string.pattern.base': 'endTime must be HH:mm.' }),
  maxParticipants: Joi.number().integer().min(2).max(500).required(),
  entryFee:        Joi.number().min(0).default(0),
  prizeInfo:       Joi.string().trim().max(500).allow('').default(''),
});

const updateTournamentSchema = Joi.object({
  turfId:          Joi.string().optional(),
  name:            Joi.string().trim().min(3).max(120),
  description:     Joi.string().trim().max(2000).allow(''),
  sport:           Joi.string().valid(...sportValues),
  date:            Joi.string().pattern(datePattern)
                     .messages({ 'string.pattern.base': 'date must be YYYY-MM-DD.' }),
  startTime:       Joi.string().pattern(timePattern)
                     .messages({ 'string.pattern.base': 'startTime must be HH:mm.' }),
  endTime:         Joi.string().pattern(timePattern)
                     .messages({ 'string.pattern.base': 'endTime must be HH:mm.' }),
  maxParticipants: Joi.number().integer().min(2).max(500),
  entryFee:        Joi.number().min(0),
  prizeInfo:       Joi.string().trim().max(500).allow(''),
  status:          Joi.string().valid('upcoming', 'ongoing', 'completed', 'cancelled'),
}).min(1);

const registerSchema = Joi.object({
  phone: Joi.string().trim().allow('').default(''),
});

module.exports = { createTournamentSchema, updateTournamentSchema, registerSchema };
