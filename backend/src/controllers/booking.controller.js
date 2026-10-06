const Booking        = require('../models/Booking');
const Turf           = require('../models/Turf');
const asyncHandler   = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const bookingService = require('../services/booking.service');

// ── Serializer ────────────────────────────────────────────────────────────────
const serializeBooking = (doc) => {
  const turf = doc.turfId && typeof doc.turfId === 'object' ? doc.turfId : null;
  const customer = doc.customerId && typeof doc.customerId === 'object' ? doc.customerId : null;

  return {
    id:                 doc._id.toString(),
    sourceType:         doc.sourceType,
    customerId:         customer ? customer._id?.toString() : doc.customerId?.toString(),
    turfId:             turf ? turf._id?.toString() : doc.turfId?.toString(),
    date:               doc.date,
    startTime:          doc.startTime,
    endTime:            doc.endTime,
    sport:              doc.sport,
    amount:             doc.amount,
    status:             doc.status,
    cancelledBy:        doc.cancelledBy ?? null,
    cancellationReason: doc.cancellationReason ?? null,
    paymentId:          doc.paymentId?.toString() ?? null,
    pendingExpiresAt:   doc.pendingExpiresAt ?? null,
    createdAt:          doc.createdAt,
    updatedAt:          doc.updatedAt,
    // Populated relations
    turf: turf ? {
      id:      turf._id?.toString(),
      name:    turf.name,
      address: turf.address,
      images:  turf.images ?? [],
      pricing: turf.pricing,
    } : null,
    customer: customer ? {
      id:    customer._id?.toString(),
      name:  customer.name,
      email: customer.email,
      phone: customer.phone ?? null,
    } : null,
  };
};

const BOOKING_POPULATE = [
  { path: 'turfId',    select: 'name address images pricing operatingHours slotDurationMinutes ownerId' },
  { path: 'customerId', select: 'name email phone' },
];

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABILITY (public — no auth)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/turfs/:id/availability?date=YYYY-MM-DD
const getTurfAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errorResponse(res, 'date query param is required (YYYY-MM-DD).', 422, 'INVALID_DATE');
  }

  // Reject past dates
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const requested = new Date(date); requested.setUTCHours(0, 0, 0, 0);
  if (requested < today) {
    return errorResponse(res, 'Cannot check availability for past dates.', 422, 'PAST_DATE');
  }

  const result = await bookingService.getAvailability(req.params.id, date);
  return successResponse(res, result);
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/bookings — rate-limited; customer creates a pending_payment hold
const createBooking = asyncHandler(async (req, res) => {
  const { turfId, date, startTime, sport } = req.body;

  // Reject past dates
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const requested = new Date(date); requested.setUTCHours(0, 0, 0, 0);
  if (requested < today) {
    return errorResponse(res, 'Cannot book a slot in the past.', 422, 'PAST_DATE');
  }

  const booking = await bookingService.createBooking({
    turfId,
    customerId: req.user.userId,
    dateStr:    date,
    startTime,
    sport,
    sourceType: 'customer',
  });

  const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
  return successResponse(res, { booking: serializeBooking(populated) }, 'Slot reserved. Complete payment within 10 minutes to confirm.', 201);
});

// GET /api/bookings/my — customer's own bookings
const getMyBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { customerId: req.user.userId, sourceType: 'customer' };
  if (status) filter.status = status;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate(BOOKING_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Booking.countDocuments(filter),
  ]);

  return successResponse(res, {
    bookings: bookings.map(serializeBooking),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// GET /api/bookings/:id — customer (own) / owner (of turf) / admin
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate([
    ...BOOKING_POPULATE,
    { path: 'turfId', select: 'name address images pricing operatingHours slotDurationMinutes ownerId' },
  ]);
  if (!booking) return errorResponse(res, 'Booking not found.', 404, 'NOT_FOUND');

  const { userId, role } = req.user;
  const turfOwnerId = booking.turfId?.ownerId?.toString();
  const isCustomer  = booking.customerId?.toString() === userId || booking.customerId?._id?.toString() === userId;
  const isOwner     = role === 'owner' && turfOwnerId === userId;
  const isAdmin     = role === 'admin';

  if (!isCustomer && !isOwner && !isAdmin) {
    return errorResponse(res, 'You do not have access to this booking.', 403, 'FORBIDDEN');
  }

  return successResponse(res, { booking: serializeBooking(booking) });
});

// PATCH /api/bookings/:id/cancel — customer (own) or admin
const cancelBooking = asyncHandler(async (req, res) => {
  const existing = await Booking.findById(req.params.id);
  if (!existing) return errorResponse(res, 'Booking not found.', 404, 'NOT_FOUND');

  const { userId, role } = req.user;
  const isOwn   = existing.customerId?.toString() === userId;
  const isAdmin = role === 'admin';
  if (!isOwn && !isAdmin) {
    return errorResponse(res, 'You can only cancel your own bookings.', 403, 'FORBIDDEN');
  }

  const reason = req.body.reason ?? null;
  const cancelledBy = isAdmin ? 'admin' : 'customer';

  const updated = await bookingService.cancelBooking(req.params.id, cancelledBy, reason);
  return successResponse(res, { booking: serializeBooking(updated) }, 'Booking cancelled.');
});

// ─────────────────────────────────────────────────────────────────────────────
// OWNER ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/owner/bookings — owner's bookings across all their turfs
const getOwnerBookings = asyncHandler(async (req, res) => {
  const { status, turfId, page = 1, limit = 30 } = req.query;

  // Find all turfs owned by this user first
  const ownedTurfs = await Turf.find({ ownerId: req.user.userId }).select('_id');
  const turfIds    = ownedTurfs.map((t) => t._id);
  if (!turfIds.length) {
    return successResponse(res, { bookings: [], total: 0, page: 1, pages: 0 });
  }

  const filter = { turfId: { $in: turfIds } };
  if (status) filter.status = status;
  if (turfId) filter.turfId = turfId;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate(BOOKING_POPULATE)
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Booking.countDocuments(filter),
  ]);

  return successResponse(res, {
    bookings: bookings.map(serializeBooking),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// PATCH /api/owner/bookings/:id/cancel — owner cancels a booking on their turf
const ownerCancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate({ path: 'turfId', select: 'ownerId' });
  if (!booking) return errorResponse(res, 'Booking not found.', 404, 'NOT_FOUND');

  const turfOwnerId = booking.turfId?.ownerId?.toString();
  if (turfOwnerId !== req.user.userId) {
    return errorResponse(res, 'This booking is not on one of your turfs.', 403, 'FORBIDDEN');
  }

  const reason  = req.body.reason ?? null;
  const updated = await bookingService.cancelBooking(req.params.id, 'owner', reason);
  return successResponse(res, { booking: serializeBooking(updated) }, 'Booking cancelled.');
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/bookings
const adminGetBookings = asyncHandler(async (req, res) => {
  const { status, turfId, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (turfId) filter.turfId = turfId;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate(BOOKING_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Booking.countDocuments(filter),
  ]);

  return successResponse(res, {
    bookings: bookings.map(serializeBooking),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

module.exports = {
  getTurfAvailability,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getOwnerBookings,
  ownerCancelBooking,
  adminGetBookings,
};
