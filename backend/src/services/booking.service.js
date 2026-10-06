/**
 * booking.service.js
 *
 * Core slot-locking and availability logic (Doc 05).
 * Shared by customer bookings (Phase 3) and tournament match reservations (Phase 5).
 *
 * Critical guarantee: a slot can never be double-booked because
 * Booking.js carries a unique partial index on { turfId, date, startTime }
 * filtered to status ≠ 'cancelled'. Any concurrent insert that collides on
 * that index throws a MongoDB 11000 duplicate-key error, which this service
 * catches and converts to SLOT_UNAVAILABLE.
 */

const mongoose = require('mongoose');
const Booking  = require('../models/Booking');
const Payment  = require('../models/Payment');
const Turf     = require('../models/Turf');
const { createNotification } = require('./notification.service');

// ── Constants ────────────────────────────────────────────────────────────────
const PENDING_HOLD_MINUTES = 10; // locked decision #5 — not configurable

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse 'HH:mm' → total minutes since midnight */
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Format minutes-since-midnight → 'HH:mm' */
const fromMinutes = (total) => {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Normalise a JS Date to midnight UTC for a given YYYY-MM-DD string */
const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/** Check whether a Date falls on a blackout date of a turf */
const isBlackout = (dateObj, blackoutDates = []) => {
  const day = dateObj.toISOString().slice(0, 10);
  return blackoutDates.some(
    (bd) => new Date(bd).toISOString().slice(0, 10) === day
  );
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate all theoretical slots for a turf on a given date,
 * respecting operating hours, slot duration and blackout dates.
 * Returns [{ startTime, endTime }] — availability not checked here.
 */
const generateSlots = (turf, dateStr) => {
  const dateObj = normalizeDate(dateStr);

  if (isBlackout(dateObj, turf.blackoutDates)) return [];

  const openMin  = toMinutes(turf.operatingHours?.open  || '06:00');
  const closeMin = toMinutes(turf.operatingHours?.close || '22:00');
  const step     = turf.slotDurationMinutes || 60;

  const slots = [];
  for (let start = openMin; start + step <= closeMin; start += step) {
    slots.push({
      startTime: fromMinutes(start),
      endTime:   fromMinutes(start + step),
    });
  }
  return slots;
};

/**
 * GET /api/turfs/:id/availability?date=YYYY-MM-DD
 *
 * Returns each slot with available/booked/blackout status.
 * Only approved + active turfs are queryable.
 */
const getAvailability = async (turfId, dateStr) => {
  const turf = await Turf.findOne({ _id: turfId, status: 'approved', isActive: true });
  if (!turf) {
    const err = new Error('Turf not found or not available for booking.');
    err.statusCode = 404;
    err.code = 'TURF_NOT_FOUND';
    throw err;
  }

  const dateObj = normalizeDate(dateStr);

  if (isBlackout(dateObj, turf.blackoutDates)) {
    return { date: dateStr, blackout: true, slots: [] };
  }

  const allSlots = generateSlots(turf, dateStr);

  // Fetch all active (non-cancelled) bookings for this turf on this date
  const existing = await Booking.find({
    turfId,
    date:   dateObj,
    status: { $ne: 'cancelled' },
  }).select('startTime status');

  const bookedTimes = new Set(existing.map((b) => b.startTime));

  const slots = allSlots.map(({ startTime, endTime }) => ({
    startTime,
    endTime,
    available: !bookedTimes.has(startTime),
    // Include pricing for the slot so the frontend can show it
    price: resolvePriceForSlot(turf, dateObj, startTime),
  }));

  return {
    date:                dateStr,
    blackout:            false,
    turfName:            turf.name,
    slotDurationMinutes: turf.slotDurationMinutes,
    slots,
  };
};

/**
 * Resolve the price for a slot based on weekday/weekend and peak hours.
 */
const resolvePriceForSlot = (turf, dateObj, startTime) => {
  const pricing   = turf.pricing;
  const isWeekend = [0, 6].includes(dateObj.getDay()); // Sun=0, Sat=6
  const base      = isWeekend && pricing.weekend ? pricing.weekend : pricing.base;

  if (!pricing.peakHours?.length) return base;

  const slotMin = toMinutes(startTime);
  const peak = pricing.peakHours.find((ph) => {
    const s = toMinutes(ph.start);
    const e = toMinutes(ph.end);
    return slotMin >= s && slotMin < e;
  });

  return peak ? peak.price : base;
};

/**
 * Create a booking with the 10-minute pending_payment hold.
 *
 * Uses the unique partial index as the sole concurrency guard —
 * no optimistic locking needed because MongoDB handles the conflict.
 *
 * @param {object} params
 * @param {string} params.turfId
 * @param {string} params.customerId     — null for tournament sourceType
 * @param {string} params.dateStr        — 'YYYY-MM-DD'
 * @param {string} params.startTime      — 'HH:mm'
 * @param {string} params.sport
 * @param {string} params.sourceType     — 'customer' | 'tournament'
 * @param {string} [params.matchId]      — only for tournament
 * @returns {Booking}
 */
const createBooking = async ({
  turfId,
  customerId = null,
  dateStr,
  startTime,
  sport,
  sourceType = 'customer',
  matchId = null,
}) => {
  const turf = await Turf.findOne({ _id: turfId, status: 'approved', isActive: true });
  if (!turf) {
    const err = new Error('This turf is not available for booking.');
    err.statusCode = 422;
    err.code = 'TURF_NOT_BOOKABLE';
    throw err;
  }

  const dateObj     = normalizeDate(dateStr);
  const allSlots    = generateSlots(turf, dateStr);
  const matchedSlot = allSlots.find((s) => s.startTime === startTime);

  if (!matchedSlot) {
    const err = new Error('Selected time slot is not valid for this turf.');
    err.statusCode = 422;
    err.code = 'INVALID_SLOT';
    throw err;
  }

  if (isBlackout(dateObj, turf.blackoutDates)) {
    const err = new Error('This turf is unavailable on the selected date.');
    err.statusCode = 422;
    err.code = 'BLACKOUT_DATE';
    throw err;
  }

  const amount           = resolvePriceForSlot(turf, dateObj, startTime);
  const pendingExpiresAt = new Date(Date.now() + PENDING_HOLD_MINUTES * 60 * 1000);

  try {
    const booking = await Booking.create({
      sourceType,
      customerId,
      matchId,
      turfId,
      date:      dateObj,
      startTime,
      endTime:   matchedSlot.endTime,
      sport,
      amount,
      status:    'pending_payment',
      pendingExpiresAt,
    });
    return booking;
  } catch (err) {
    if (err.code === 11000) {
      // Unique index violation — slot was taken between the availability check and insert
      const conflict = new Error('This slot is no longer available. Please choose another time.');
      conflict.statusCode = 409;
      conflict.code = 'SLOT_UNAVAILABLE';
      throw conflict;
    }
    throw err;
  }
};

/**
 * Confirm a booking after payment is verified.
 * Sets status → 'confirmed', clears pendingExpiresAt.
 * Fires a booking_confirmed in-app notification (non-blocking).
 */
const confirmBooking = async (bookingId, paymentId) => {
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status: 'confirmed', paymentId, pendingExpiresAt: null },
    { new: true }
  ).populate({ path: 'turfId', select: 'name' });
  if (!booking) throw Object.assign(new Error('Booking not found.'), { statusCode: 404, code: 'NOT_FOUND' });

  // Non-blocking notification
  if (booking.customerId) {
    const turfName = booking.turfId?.name ?? 'your turf';
    const dateStr  = new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    createNotification({
      userId:  booking.customerId.toString(),
      type:    'booking_confirmed',
      title:   'Booking Confirmed',
      message: `Your booking at ${turfName} on ${dateStr} (${booking.startTime}–${booking.endTime}) is confirmed.`,
      refId:   booking._id.toString(),
      refType: 'booking',
    });
  }

  return booking;
};

/**
 * Cancel a booking.
 * If the booking was already paid (status='confirmed' and has a paymentId),
 * the associated Payment record is marked 'refunded' with the full amount
 * (simulated refund for the demo UPI flow; Razorpay refunds use the real API).
 */
const cancelBooking = async (bookingId, cancelledBy, reason = null) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found.'), { statusCode: 404, code: 'NOT_FOUND' });

  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('Booking is already cancelled.'), { statusCode: 409, code: 'ALREADY_CANCELLED' });
  }
  if (booking.status === 'completed') {
    throw Object.assign(new Error('Completed bookings cannot be cancelled.'), { statusCode: 409, code: 'ALREADY_COMPLETED' });
  }

  // Simulate refund: if booking had a payment, mark it refunded
  if (booking.paymentId) {
    try {
      const payment = await Payment.findById(booking.paymentId);
      if (payment && payment.status === 'paid') {
        payment.status       = 'refunded';
        payment.refundAmount = payment.amount;  // full refund
        payment.refundId     = `DEMO-REFUND-${booking._id.toString().slice(-8).toUpperCase()}`;
        await payment.save();
      }
    } catch (err) {
      // Non-fatal — log but do not block the cancellation
      console.error('[booking.service] Refund simulation failed:', err.message);
    }
  }

  booking.status             = 'cancelled';
  booking.cancelledBy        = cancelledBy;
  booking.cancellationReason = reason;
  booking.pendingExpiresAt   = null;
  await booking.save();
  return booking;
};

/**
 * Expiry job: marks stale pending_payment bookings as 'cancelled'.
 * Called by the cron job in app.js every minute.
 * The MongoDB TTL index also hard-deletes expired docs, but this job
 * ensures the status is updated to 'cancelled' first so the unique
 * partial index is vacated and the slot re-opens.
 */
const expireStalePendingBookings = async () => {
  const now = new Date();
  const result = await Booking.updateMany(
    {
      status:            'pending_payment',
      pendingExpiresAt:  { $lte: now },
    },
    {
      $set: { status: 'cancelled', cancelledBy: null, pendingExpiresAt: null },
    }
  );
  if (result.modifiedCount > 0) {
    console.log(`[Expiry] Cancelled ${result.modifiedCount} stale pending_payment booking(s).`);
  }
};

module.exports = {
  generateSlots,
  getAvailability,
  createBooking,
  confirmBooking,
  cancelBooking,
  expireStalePendingBookings,
  resolvePriceForSlot,
  normalizeDate,
};
