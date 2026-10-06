const Joi = require('joi');

const createOrderSchema = Joi.object({
  bookingId: Joi.string().trim().required().messages({
    'any.required': 'bookingId is required.',
  }),
});

const verifyPaymentSchema = Joi.object({
  orderId:            Joi.string().trim().required(),
  razorpayPaymentId:  Joi.string().trim().required(),
  razorpaySignature:  Joi.string().trim().required(),
});

module.exports = { createOrderSchema, verifyPaymentSchema };
