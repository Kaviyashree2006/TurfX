const { verifyAccessToken } = require('../utils/tokenUtils');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches { userId, role } to req.user.
 * Does NOT check approvalStatus — that is ownerApproved.middleware's job (Doc 08).
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication required.', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired.', 401, 'TOKEN_EXPIRED');
    }
    return errorResponse(res, 'Invalid token.', 401, 'INVALID_TOKEN');
  }
};

/**
 * Optional authentication: if Bearer token present and valid, attaches req.user.
 * Otherwise proceeds without error (for public endpoints that customize output for logged-in users).
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyAccessToken(token);
      req.user = { userId: decoded.userId, role: decoded.role };
    } catch {
      // Ignore token errors for optional authentication
    }
  }
  next();
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
