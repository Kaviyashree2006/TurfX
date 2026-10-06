const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  registerCustomerSchema,
  registerOwnerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validators');
const { resubmitOwnerSchema } = require('../validators/admin.validators');
const {
  registerCustomer,
  registerOwner,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  resubmitOwner,
} = require('../controllers/auth.controller');

// ─── Rate limiters (Doc 09, locked decision #14) ─────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many password reset attempts. Please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes (Doc 07) ─────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerCustomerSchema), registerCustomer);

// POST /api/auth/register/owner
router.post('/register/owner', authLimiter, validate(registerOwnerSchema), registerOwner);

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), login);

// POST /api/auth/refresh  — uses httpOnly cookie, no auth middleware needed
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me  — requires valid access token
router.get('/me', authMiddleware, getMe);

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword);

// PUT /api/auth/owner/resubmit
// Auth + role only — NOT ownerApproved (rejected owners must reach this endpoint)
router.put('/owner/resubmit', authMiddleware, roleMiddleware(['owner']), validate(resubmitOwnerSchema), resubmitOwner);

module.exports = router;
