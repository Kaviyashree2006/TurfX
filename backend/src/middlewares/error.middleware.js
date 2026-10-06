const env = require('../config/env');

/**
 * Central error handler (Doc 05).
 * Returns consistent { success: false, message, code } shape.
 * Never leaks stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  // Log the full error server-side (never to the client in production)
  console.error(`[ERROR] ${req.method} ${req.originalUrl} —`, err.message);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `An account with this ${field} already exists.`,
      code: 'DUPLICATE_KEY',
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(' ');
    return res.status(422).json({ success: false, message, code: 'VALIDATION_ERROR' });
  }

  // JWT errors (caught in middleware but included as safety net)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.', code: 'INVALID_TOKEN' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred.'
      : err.message || 'An unexpected error occurred.';

  return res.status(statusCode).json({
    success: false,
    message,
    code: err.code || 'INTERNAL_ERROR',
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
