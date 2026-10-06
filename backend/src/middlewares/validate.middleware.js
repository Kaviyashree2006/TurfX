const { errorResponse } = require('../utils/apiResponse');

/**
 * Factory: returns Express middleware that validates req.body against a Joi schema.
 * On failure returns 422 with the first validation message.
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: true, stripUnknown: true });
  if (error) {
    return errorResponse(res, error.details[0].message, 422, 'VALIDATION_ERROR');
  }
  next();
};

module.exports = validate;
