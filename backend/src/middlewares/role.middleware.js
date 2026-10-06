const { errorResponse } = require('../utils/apiResponse');

/**
 * Checks that req.user.role is in the allowed roles list.
 * Must run AFTER authMiddleware.
 */
const roleMiddleware = (allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required.', 401, 'UNAUTHORIZED');
  }
  if (!allowedRoles.includes(req.user.role)) {
    return errorResponse(res, 'You do not have permission to perform this action.', 403, 'FORBIDDEN');
  }
  next();
};

module.exports = roleMiddleware;
