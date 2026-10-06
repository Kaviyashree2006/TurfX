const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

/**
 * For owner write routes: queries the live User document to check
 * approvalStatus === 'approved'. Never trusts the JWT claim (Doc 08,
 * locked decision #11 — JWT carries no approval status).
 *
 * Must run AFTER authMiddleware + roleMiddleware(['owner']).
 */
const ownerApprovedMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('approvalStatus isActive');
    if (!user || !user.isActive) {
      return errorResponse(res, 'Account not found or deactivated.', 403, 'ACCOUNT_INACTIVE');
    }
    if (user.approvalStatus !== 'approved') {
      return errorResponse(
        res,
        'Your account is pending approval by an administrator.',
        403,
        'OWNER_NOT_APPROVED'
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = ownerApprovedMiddleware;
