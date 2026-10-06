const Joi = require('joi');

const rejectOwnerSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(10).max(500).required().messages({
    'string.min': 'Rejection reason must be at least 10 characters.',
    'string.max': 'Rejection reason must be 500 characters or fewer.',
    'any.required': 'A rejection reason is required.',
  }),
});

const resubmitOwnerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).optional().allow('', null),
  businessName: Joi.string().trim().min(2).max(200).required(),
  businessAddress: Joi.string().trim().min(5).max(500).required(),
});

module.exports = { rejectOwnerSchema, resubmitOwnerSchema };
