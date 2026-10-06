/**
 * review.controller.js — Phase 6
 *
 * Route map:
 *   PUBLIC
 *     GET  /api/turfs/:id/reviews          → getTurfReviews
 *   CUSTOMER (auth + role customer)
 *     POST   /api/reviews                  → createReview
 *     PUT    /api/reviews/:id              → updateReview
 *     DELETE /api/reviews/:id              → deleteReview
 *     GET    /api/reviews/my               → getMyReviews
 *   OWNER (via owner.routes.js)
 *     GET    /api/owner/turfs/:id/reviews  → getOwnerTurfReviews
 *   ADMIN (via admin.routes.js)
 *     GET    /api/admin/reviews            → adminGetReviews
 *     DELETE /api/admin/reviews/:id        → adminDeleteReview
 */

const Review  = require('../models/Review');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { recalcRating } = require('../services/review.service');

// ── Serialiser ────────────────────────────────────────────────────────────────
const serializeReview = (doc) => {
  const customer = doc.customerId && typeof doc.customerId === 'object' ? doc.customerId : null;
  return {
    id:         doc._id.toString(),
    turfId:     doc.turfId?.toString?.() ?? doc.turfId,
    customerId: customer ? customer._id.toString() : doc.customerId?.toString(),
    bookingId:  doc.bookingId?.toString?.() ?? doc.bookingId,
    rating:     doc.rating,
    comment:    doc.comment,
    createdAt:  doc.createdAt,
    updatedAt:  doc.updatedAt,
    customer: customer ? {
      id:   customer._id.toString(),
      name: customer.name,
    } : null,
  };
};

const REVIEW_POPULATE = { path: 'customerId', select: 'name' };

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// GET /api/turfs/:id/reviews?page=1&limit=10
const getTurfReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [reviews, total] = await Promise.all([
    Review.find({ turfId: req.params.id })
      .populate(REVIEW_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Review.countDocuments({ turfId: req.params.id }),
  ]);

  return successResponse(res, {
    reviews: reviews.map(serializeReview),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// ── CUSTOMER ──────────────────────────────────────────────────────────────────

// GET /api/reviews/my
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ customerId: req.user.userId })
    .sort({ createdAt: -1 });
  return successResponse(res, { reviews: reviews.map(serializeReview), total: reviews.length });
});

// POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment = '' } = req.body;

  // Booking must exist and belong to this customer
  const booking = await Booking.findById(bookingId)
    .select('customerId turfId status date endTime paymentId');
  if (!booking) return errorResponse(res, 'Booking not found.', 404, 'NOT_FOUND');
  if (booking.customerId.toString() !== req.user.userId) {
    return errorResponse(res, 'This booking does not belong to you.', 403, 'FORBIDDEN');
  }

  // Must have been paid (paymentId set) — blocks pending_payment and cancelled bookings
  if (!booking.paymentId) {
    return errorResponse(
      res,
      'You can only review a booking that has been paid.',
      409,
      'BOOKING_NOT_PAID'
    );
  }

  // Accept 'completed' or 'confirmed' bookings that have been paid
  if (booking.status !== 'confirmed' && booking.status !== 'completed') {
    return errorResponse(
      res,
      'You can only review a confirmed or completed booking.',
      409,
      'BOOKING_NOT_COMPLETED'
    );
  }

  // Duplicate check (also enforced by DB unique index — this gives a friendlier error)
  const existing = await Review.findOne({ bookingId });
  if (existing) {
    return errorResponse(res, 'You have already reviewed this booking.', 409, 'ALREADY_REVIEWED');
  }

  const review = await Review.create({
    turfId:     booking.turfId,
    customerId: req.user.userId,
    bookingId,
    rating,
    comment,
  });

  await recalcRating(booking.turfId);

  const populated = await Review.findById(review._id).populate(REVIEW_POPULATE);
  return successResponse(res, { review: serializeReview(populated) }, 'Review submitted.', 201);
});

// PUT /api/reviews/:id
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return errorResponse(res, 'Review not found.', 404, 'NOT_FOUND');
  if (review.customerId.toString() !== req.user.userId) {
    return errorResponse(res, 'You can only edit your own reviews.', 403, 'FORBIDDEN');
  }

  if (req.body.rating  !== undefined) review.rating  = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();

  await recalcRating(review.turfId);

  const populated = await Review.findById(review._id).populate(REVIEW_POPULATE);
  return successResponse(res, { review: serializeReview(populated) }, 'Review updated.');
});

// DELETE /api/reviews/:id — customer deletes their own review
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return errorResponse(res, 'Review not found.', 404, 'NOT_FOUND');
  if (review.customerId.toString() !== req.user.userId) {
    return errorResponse(res, 'You can only delete your own reviews.', 403, 'FORBIDDEN');
  }

  const turfId = review.turfId;
  await review.deleteOne();
  await recalcRating(turfId);

  return successResponse(res, {}, 'Review deleted.');
});

// ── OWNER ─────────────────────────────────────────────────────────────────────

// GET /api/owner/turfs/:id/reviews
const getOwnerTurfReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [reviews, total] = await Promise.all([
    Review.find({ turfId: req.params.id })
      .populate(REVIEW_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Review.countDocuments({ turfId: req.params.id }),
  ]);

  // Verify this turf belongs to the requesting owner
  const Turf = require('../models/Turf');
  const turf = await Turf.findById(req.params.id).select('ownerId name ratingAvg ratingCount');
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');
  if (turf.ownerId.toString() !== req.user.userId) {
    return errorResponse(res, 'This turf does not belong to you.', 403, 'FORBIDDEN');
  }

  return successResponse(res, {
    turfName:    turf.name,
    ratingAvg:   turf.ratingAvg,
    ratingCount: turf.ratingCount,
    reviews:     reviews.map(serializeReview),
    total,
    page:        parseInt(page, 10),
    pages:       Math.ceil(total / parseInt(limit, 10)),
  });
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────

// GET /api/admin/reviews?turfId=&page=
const adminGetReviews = asyncHandler(async (req, res) => {
  const { turfId, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (turfId) filter.turfId = turfId;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate(REVIEW_POPULATE)
      .populate({ path: 'turfId', select: 'name' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Review.countDocuments(filter),
  ]);

  return successResponse(res, {
    reviews: reviews.map(r => ({
      ...serializeReview(r),
      turf: r.turfId && typeof r.turfId === 'object'
        ? { id: r.turfId._id.toString(), name: r.turfId.name }
        : null,
    })),
    total,
    page:  parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// DELETE /api/admin/reviews/:id — admin removes inappropriate review
const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return errorResponse(res, 'Review not found.', 404, 'NOT_FOUND');

  const turfId = review.turfId;
  await review.deleteOne();
  await recalcRating(turfId);

  return successResponse(res, {}, 'Review removed.');
});

module.exports = {
  getTurfReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  getOwnerTurfReviews,
  adminGetReviews,
  adminDeleteReview,
};
