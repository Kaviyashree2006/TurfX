const Joi = require('joi');

const createReviewSchema = Joi.object({
  bookingId: Joi.string().required(),
  rating:    Joi.number().integer().min(1).max(5).required(),
  comment:   Joi.string().trim().max(1000).allow('').default(''),
});

const updateReviewSchema = Joi.object({
  rating:  Joi.number().integer().min(1).max(5),
  comment: Joi.string().trim().max(1000).allow(''),
}).min(1);

module.exports = { createReviewSchema, updateReviewSchema };
