const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const validate       = require('../middlewares/validate.middleware');
const { createBookingSchema, cancelBookingSchema } = require('../validators/booking.validators');
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/booking.controller');

// Rate limiter on booking creation (locked decision #13 / Doc 05)
// Caps pending_payment holds a single account can create in a short window
const bookingCreateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,               // 5 booking attempts per minute per IP
  message: { success: false, message: 'Too many booking attempts. Please slow down.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// POST /api/bookings — authenticated customer only
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['customer']),
  bookingCreateLimiter,
  validate(createBookingSchema),
  createBooking
);

// GET /api/bookings/my — MUST come before /api/bookings/:id
router.get('/my', authMiddleware, roleMiddleware(['customer']), getMyBookings);

// GET /api/bookings/:id — customer (own) / owner (of turf) / admin
router.get('/:id', authMiddleware, getBookingById);

// PATCH /api/bookings/:id/cancel — customer (own) or admin
router.patch(
  '/:id/cancel',
  authMiddleware,
  validate(cancelBookingSchema),
  cancelBooking
);

module.exports = router;
