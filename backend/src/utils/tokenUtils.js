const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Sign a short-lived access token.
 * Payload: { userId, role } ONLY — no isApproved (locked decision #11).
 */
const signAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
};

/**
 * Sign a long-lived refresh token.
 */
const signRefreshToken = (userId) => {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Generate a cryptographically random reset token.
 * Returns { rawToken, hashedToken } — store only the hash, send the raw.
 */
const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

/**
 * Hash a raw token for comparison against the stored hash.
 */
const hashToken = (raw) => {
  return crypto.createHash('sha256').update(raw).digest('hex');
};

/**
 * Hash a refresh token for server-side storage (Doc 08).
 */
const hashRefreshToken = (raw) => {
  return crypto.createHash('sha256').update(raw).digest('hex');
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateResetToken,
  hashToken,
  hashRefreshToken,
};
