const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  hashToken,
  hashRefreshToken,
} = require('../utils/tokenUtils');
const { refreshCookieOptions, clearRefreshCookieOptions } = require('../utils/cookieUtils');
const { sendPasswordResetEmail } = require('../services/notification.service');
const env = require('../config/env');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Issue both tokens, store hashed refresh token, set cookie, return access token.
 */
const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user._id.toString(), user.role);
  const refreshToken = signRefreshToken(user._id.toString());
  const hashed = hashRefreshToken(refreshToken);

  // Store hashed refresh token server-side for revocation support
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: hashed },
  });

  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  return accessToken;
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'An account with this email already exists.', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    phone: phone || null,
    role: 'customer',
    approvalStatus: 'approved', // customers are immediately active
  });

  const accessToken = await issueTokens(user, res);

  return successResponse(
    res,
    {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    },
    'Account created successfully.',
    201
  );
});

// ─── POST /api/auth/register/owner ────────────────────────────────────────────
const registerOwner = asyncHandler(async (req, res) => {
  const { name, email, password, phone, businessName, businessAddress } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'An account with this email already exists.', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    phone: phone || null,
    role: 'owner',
    approvalStatus: 'pending', // owners require admin approval
    businessName,
    businessAddress,
  });

  const accessToken = await issueTokens(user, res);

  return successResponse(
    res,
    {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    },
    'Owner account created. Your account is pending admin approval.',
    201
  );
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Explicitly select passwordHash (select:false in schema)
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.isActive) {
    return errorResponse(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return errorResponse(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = await issueTokens(user, res);

  return successResponse(res, {
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    },
  });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return errorResponse(res, 'Refresh token missing.', 401, 'MISSING_REFRESH_TOKEN');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    res.clearCookie('refreshToken', clearRefreshCookieOptions());
    return errorResponse(res, 'Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  const hashed = hashRefreshToken(token);
  const user = await User.findOne({ _id: decoded.userId, refreshTokens: hashed }).select(
    'name email role approvalStatus isActive refreshTokens'
  );

  if (!user || !user.isActive) {
    res.clearCookie('refreshToken', clearRefreshCookieOptions());
    return errorResponse(res, 'Invalid session.', 401, 'INVALID_SESSION');
  }

  // Rotate: remove old hashed token, add new one.
  // MongoDB does not allow $pull and $push on the same field in one update —
  // split into two sequential operations.
  const newRefreshToken = signRefreshToken(user._id.toString());
  const newHashed = hashRefreshToken(newRefreshToken);

  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: hashed },
  });
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: newHashed },
  });

  res.cookie('refreshToken', newRefreshToken, refreshCookieOptions());
  const accessToken = signAccessToken(user._id.toString(), user.role);

  return successResponse(res, {
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    },
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    const hashed = hashRefreshToken(token);
    // Identify the user from the cookie itself (not the access token),
    // so logout works even when the access token has expired.
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.userId, {
        $pull: { refreshTokens: hashed },
      });
    } catch {
      // Token is invalid/expired — nothing to revoke, just clear the cookie.
    }
  }

  res.clearCookie('refreshToken', clearRefreshCookieOptions());
  return successResponse(res, {}, 'Logged out successfully.');
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    'name email phone role approvalStatus rejectionReason businessName businessAddress isActive createdAt'
  );
  if (!user) {
    return errorResponse(res, 'User not found.', 404, 'NOT_FOUND');
  }
  return successResponse(res, { user });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always return the same message to prevent email enumeration
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  const user = await User.findOne({ email });
  if (!user) {
    return successResponse(res, {}, genericMessage);
  }

  const { rawToken, hashedToken } = generateResetToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await User.findByIdAndUpdate(user._id, {
    passwordResetTokenHash: hashedToken,
    passwordResetExpiresAt: expiresAt,
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password/${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return successResponse(res, {}, genericMessage);
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetTokenHash: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt +refreshTokens');

  if (!user) {
    return errorResponse(
      res,
      'This password reset link is invalid or has expired.',
      400,
      'INVALID_RESET_TOKEN'
    );
  }

  const passwordHash = await User.hashPassword(password);

  // Single-use: clear token, update password, revoke all refresh tokens
  await User.findByIdAndUpdate(user._id, {
    passwordHash,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    refreshTokens: [], // invalidate all sessions on password change
  });

  res.clearCookie('refreshToken', clearRefreshCookieOptions());

  return successResponse(res, {}, 'Password reset successfully. Please log in with your new password.');
});

// ─── PUT /api/auth/owner/resubmit ─────────────────────────────────────────────
// Owner (own, approvalStatus === 'rejected') updates their profile and resubmits for review.
// Returns to 'pending' state. Does NOT require ownerApprovedMiddleware — rejected owners must
// be able to reach this endpoint.
const resubmitOwner = asyncHandler(async (req, res) => {
  const { name, phone, businessName, businessAddress } = req.body;

  // Must be authenticated as 'owner' (enforced by auth + role middleware on the route).
  const owner = await User.findById(req.user.userId).select(
    'name email phone role approvalStatus rejectionReason resubmissionCount businessName businessAddress isActive'
  );

  if (!owner || !owner.isActive) {
    return errorResponse(res, 'Account not found or deactivated.', 403, 'ACCOUNT_INACTIVE');
  }

  // Only rejected owners can resubmit
  if (owner.approvalStatus !== 'rejected') {
    return errorResponse(
      res,
      'Resubmission is only available for rejected accounts.',
      403,
      'RESUBMIT_NOT_ALLOWED'
    );
  }

  owner.name = name.trim();
  owner.phone = phone ? phone.trim() : null;
  owner.businessName = businessName.trim();
  owner.businessAddress = businessAddress.trim();
  owner.approvalStatus = 'pending';
  owner.rejectionReason = null;
  owner.resubmissionCount = (owner.resubmissionCount || 0) + 1;

  await owner.save();

  return successResponse(
    res,
    {
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
        approvalStatus: owner.approvalStatus,
        rejectionReason: owner.rejectionReason,
        businessName: owner.businessName,
        businessAddress: owner.businessAddress,
        resubmissionCount: owner.resubmissionCount,
      },
    },
    'Your application has been resubmitted for review.'
  );
});

module.exports = {
  registerCustomer,
  registerOwner,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  resubmitOwner,
};
