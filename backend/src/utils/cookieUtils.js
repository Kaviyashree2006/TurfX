const env = require('../config/env');

/**
 * Cookie options for the refresh token (Doc 08 / locked decision #19).
 * httpOnly: not readable by JS
 * secure: HTTPS only (relaxed in dev)
 * sameSite: 'strict' — no cross-site sending
 */
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/', // sent on all requests so the browser attaches it to /api/auth/refresh
});

const clearRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});

module.exports = { refreshCookieOptions, clearRefreshCookieOptions };
