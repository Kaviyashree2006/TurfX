const Joi = require('joi');

const passwordRule = Joi.string()
  .min(8)
  .max(72) // bcrypt limit
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[0-9]/, 'number')
  .messages({
    'string.min': 'Password must be at least 8 characters.',
    'string.pattern.name':
      'Password must contain at least one uppercase letter and one number.',
  });

const registerCustomerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  password: passwordRule.required(),
  phone: Joi.string()
    .pattern(/^\+?[0-9]{7,15}$/)
    .optional()
    .allow('', null),
});

const registerOwnerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  password: passwordRule.required(),
  phone: Joi.string()
    .pattern(/^\+?[0-9]{7,15}$/)
    .optional()
    .allow('', null),
  businessName: Joi.string().trim().min(2).max(200).required(),
  businessAddress: Joi.string().trim().min(5).max(500).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordRule.required(),
});

module.exports = {
  registerCustomerSchema,
  registerOwnerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
