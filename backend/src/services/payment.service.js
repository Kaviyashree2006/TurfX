/**
 * payment.service.js — Razorpay integration (locked decision #1).
 *
 * Responsibilities:
 *  1. Create a Razorpay order for a pending booking.
 *  2. Verify the HMAC-SHA256 signature returned by Razorpay after checkout.
 *  3. Confirm the booking and persist the Payment record on success.
 *  4. Handle webhook events as a secondary confirmation path.
 *
 * Never stores card numbers, UPI handles, or any raw payment credentials.
 * Only Razorpay's own order/payment/signature IDs are persisted.
 */

const crypto    = require('crypto');
const { getRazorpay }    = require('../config/razorpay');
const Payment   = require('../models/Payment');
const Booking   = require('../models/Booking');
const { confirmBooking } = require('./booking.service');
const { getSettings }    = require('./settings.service');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert rupees (Number) to Razorpay's paise (integer). */
const toPaise = (rupees) => Math.round(rupees * 100);

/** HMAC-SHA256 of `orderId|paymentId` using the Razorpay key_secret. */
const computeSignature = (orderId, razorpayPaymentId) => {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${razorpayPaymentId}`)
    .digest('hex');
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a Razorpay order for the given booking.
 *
 * Guards:
 *  - Booking must exist and belong to the requesting user.
 *  - Booking must be in `pending_payment` status (not expired/cancelled).
 *  - No existing `paid` Payment record for this booking (duplicate prevention).
 *
 * Returns the Razorpay order object plus the Payment document id.
 */
const createOrder = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const err = new Error('Booking not found.');
    err.statusCode = 404; err.code = 'NOT_FOUND';
    throw err;
  }
  if (booking.customerId?.toString() !== userId) {
    const err = new Error('You do not have access to this booking.');
    err.statusCode = 403; err.code = 'FORBIDDEN';
    throw err;
  }
  if (booking.status !== 'pending_payment') {
    const err = new Error(
      booking.status === 'confirmed'
        ? 'This booking has already been paid.'
        : `Cannot pay for a booking with status '${booking.status}'.`
    );
    err.statusCode = 409; err.code = 'BOOKING_NOT_PAYABLE';
    throw err;
  }
  // Check the 10-minute hold has not expired
  if (booking.pendingExpiresAt && new Date(booking.pendingExpiresAt) < new Date()) {
    const err = new Error('Your booking hold has expired. Please make a new reservation.');
    err.statusCode = 410; err.code = 'BOOKING_EXPIRED';
    throw err;
  }
  // Prevent duplicate orders for the same booking
  const existingPaid = await Payment.findOne({ bookingId, status: 'paid' });
  if (existingPaid) {
    const err = new Error('This booking has already been paid.');
    err.statusCode = 409; err.code = 'ALREADY_PAID';
    throw err;
  }

  // Calculate amount including platform fee (locked decision #6)
  const settings = await getSettings();
  const platformFeePercent = settings.platformFeePercent ?? 0;
  const platformFeeAmount  = Math.round(booking.amount * (platformFeePercent / 100));
  const totalAmount        = booking.amount + platformFeeAmount;

  // Create Razorpay order — throws 503 if not configured
  const razorpay = getRazorpay();
  const rzpOrder = await razorpay.orders.create({
    amount:   toPaise(totalAmount),
    currency: 'INR',
    receipt:  bookingId.toString().slice(-12), // Razorpay receipt max 40 chars
    notes: {
      bookingId:  bookingId.toString(),
      turfId:     booking.turfId?.toString(),
      customerId: userId,
    },
  });

  // Persist Payment document with status 'created'
  const payment = await Payment.create({
    bookingId,
    userId,
    provider:         'razorpay',
    orderId:          rzpOrder.id,
    amount:           totalAmount,
    platformFeeAmount,
    currency:         'INR',
    status:           'created',
  });

  return { rzpOrder, payment };
};

/**
 * Verify the Razorpay payment signature and confirm the booking.
 *
 * Call after the customer completes checkout and Razorpay returns
 * razorpay_order_id / razorpay_payment_id / razorpay_signature.
 *
 * Security: signature is verified server-side with HMAC-SHA256.
 * Never trust the client-side `success` callback alone.
 */
const verifyAndConfirm = async ({ orderId, razorpayPaymentId, razorpaySignature, userId }) => {
  const payment = await Payment.findOne({ orderId });

  if (!payment) {
    const err = new Error('Payment record not found for this order.');
    err.statusCode = 404; err.code = 'NOT_FOUND';
    throw err;
  }
  if (payment.userId?.toString() !== userId) {
    const err = new Error('Payment does not belong to you.');
    err.statusCode = 403; err.code = 'FORBIDDEN';
    throw err;
  }
  if (payment.signatureVerified) {
    // Already confirmed — idempotent success
    const booking = await Booking.findById(payment.bookingId);
    return { payment, booking };
  }

  // Compute expected signature and compare
  const expected = computeSignature(orderId, razorpayPaymentId);
  if (expected !== razorpaySignature) {
    // Mark payment as failed and do NOT confirm the booking
    await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
    const err = new Error('Payment signature verification failed. Please contact support.');
    err.statusCode = 400; err.code = 'SIGNATURE_MISMATCH';
    throw err;
  }

  // Signature valid — update Payment record
  await Payment.findByIdAndUpdate(payment._id, {
    razorpayPaymentId,
    razorpaySignature,
    signatureVerified: true,
    status: 'paid',
  });

  // Confirm the booking (sets status → 'confirmed', clears pendingExpiresAt)
  const booking = await confirmBooking(payment.bookingId.toString(), payment._id.toString());

  return { payment: await Payment.findById(payment._id), booking };
};

/**
 * Handle Razorpay webhook events.
 * Called with the raw request body bytes and the Razorpay-Signature header.
 *
 * We handle `payment.captured` as a secondary confirmation path in case
 * the customer's browser never called /verify (tab closed, network drop, etc.).
 */
const handleWebhook = async (rawBody, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured — skipping verification.');
    return { handled: false, reason: 'no_secret' };
  }

  // Verify webhook signature
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    const err = new Error('Webhook signature invalid.');
    err.statusCode = 400; err.code = 'INVALID_WEBHOOK_SIGNATURE';
    throw err;
  }

  const event = JSON.parse(rawBody.toString());
  const eventType = event.event;

  if (eventType === 'payment.captured') {
    const payload    = event.payload?.payment?.entity;
    const orderId    = payload?.order_id;
    const paymentId  = payload?.id;

    if (!orderId || !paymentId) return { handled: false, reason: 'missing_ids' };

    const payment = await Payment.findOne({ orderId });
    if (!payment) return { handled: false, reason: 'no_payment_record' };
    if (payment.signatureVerified) return { handled: true, reason: 'already_confirmed' };

    // Mark payment as paid (no signature to verify from webhook — Razorpay guarantees delivery)
    await Payment.findByIdAndUpdate(payment._id, {
      razorpayPaymentId: paymentId,
      signatureVerified: true,
      status: 'paid',
    });

    // Confirm booking if still pending
    const booking = await Booking.findById(payment.bookingId);
    if (booking && booking.status === 'pending_payment') {
      await confirmBooking(payment.bookingId.toString(), payment._id.toString());
    }

    return { handled: true, reason: 'payment_captured' };
  }

  return { handled: false, reason: `unhandled_event:${eventType}` };
};

/**
 * Serialize a Payment doc for API responses.
 * Never exposes razorpaySignature (raw HMAC value).
 */
const serializePayment = (doc) => ({
  id:                doc._id.toString(),
  bookingId:         doc.bookingId?.toString() ?? null,
  userId:            doc.userId?.toString()    ?? null,
  provider:          doc.provider,
  orderId:           doc.orderId,
  razorpayPaymentId: doc.razorpayPaymentId     ?? null,
  signatureVerified: doc.signatureVerified,
  amount:            doc.amount,
  platformFeeAmount: doc.platformFeeAmount,
  currency:          doc.currency,
  status:            doc.status,
  refundId:          doc.refundId              ?? null,
  refundAmount:      doc.refundAmount          ?? 0,
  createdAt:         doc.createdAt,
  updatedAt:         doc.updatedAt,
});

module.exports = { createOrder, verifyAndConfirm, handleWebhook, serializePayment };

// ─────────────────────────────────────────────────────────────────────────────
// DEMO UPI PAYMENT  (replaces Razorpay checkout while credentials are absent)
// Razorpay code above is preserved and can be restored at any time.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the UPI deep-link URI and display info for the frontend QR panel.
 * No Payment document is created yet — that happens on demoConfirm().
 */
const getUpiData = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const err = new Error('Booking not found.'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  if (booking.customerId?.toString() !== userId) {
    const err = new Error('You do not have access to this booking.'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }
  if (booking.status !== 'pending_payment') {
    const msg = booking.status === 'confirmed' ? 'This booking has already been paid.'
      : `Cannot pay for a booking with status '${booking.status}'.`;
    const err = new Error(msg); err.statusCode = 409; err.code = 'BOOKING_NOT_PAYABLE'; throw err;
  }
  if (booking.pendingExpiresAt && new Date(booking.pendingExpiresAt) < new Date()) {
    const err = new Error('Your booking hold has expired. Please make a new reservation.');
    err.statusCode = 410; err.code = 'BOOKING_EXPIRED'; throw err;
  }

  const settings = await getSettings();
  const platformFeePercent = settings.platformFeePercent ?? 0;
  const platformFeeAmount  = Math.round(booking.amount * (platformFeePercent / 100));
  const totalAmount        = booking.amount + platformFeeAmount;

  const upiId   = process.env.DEMO_UPI_ID || 'turfx@upi';
  const ref     = bookingId.toString().slice(-8).toUpperCase();
  const upiUri  = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=TurfX&am=${totalAmount}&cu=INR&tn=TurfX-${ref}`;

  return {
    upiId,
    upiUri,
    bookingRef:       ref,
    amount:           totalAmount,
    platformFeeAmount,
    currency:         'INR',
    isDemo:           true,
  };
};

/**
 * Demo "confirm payment" — called after the customer scans the QR and taps
 * "Payment Completed". No real verification occurs; this is a demo flow.
 *
 * Guards (identical to real payment):
 *  - Booking must still be pending_payment and not expired.
 *  - No duplicate confirmation.
 */
const demoConfirm = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const err = new Error('Booking not found.'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  if (booking.customerId?.toString() !== userId) {
    const err = new Error('You do not have access to this booking.'); err.statusCode = 403; err.code = 'FORBIDDEN'; throw err;
  }
  if (booking.status === 'confirmed') {
    // Idempotent — already done
    const existingPayment = await Payment.findOne({ bookingId, status: 'paid' });
    return { payment: existingPayment, booking };
  }
  if (booking.status !== 'pending_payment') {
    const err = new Error(`Cannot confirm a booking with status '${booking.status}'.`);
    err.statusCode = 409; err.code = 'BOOKING_NOT_PAYABLE'; throw err;
  }
  if (booking.pendingExpiresAt && new Date(booking.pendingExpiresAt) < new Date()) {
    const err = new Error('Your booking hold has expired. Please make a new reservation.');
    err.statusCode = 410; err.code = 'BOOKING_EXPIRED'; throw err;
  }

  const existingPaid = await Payment.findOne({ bookingId, status: 'paid' });
  if (existingPaid) {
    const err = new Error('This booking has already been paid.'); err.statusCode = 409; err.code = 'ALREADY_PAID'; throw err;
  }

  const settings = await getSettings();
  const platformFeePercent = settings.platformFeePercent ?? 0;
  const platformFeeAmount  = Math.round(booking.amount * (platformFeePercent / 100));
  const totalAmount        = booking.amount + platformFeeAmount;

  // Create Payment record marked as paid (demo — no real transaction ID)
  const payment = await Payment.create({
    bookingId,
    userId,
    provider:          'demo_upi',
    orderId:           `DEMO-${bookingId.toString().slice(-8).toUpperCase()}`,
    razorpayPaymentId: null,
    razorpaySignature: null,
    signatureVerified: false, // not applicable for demo
    amount:            totalAmount,
    platformFeeAmount,
    currency:          'INR',
    status:            'paid',
  });

  // Confirm the booking via existing booking.service
  const updatedBooking = await confirmBooking(bookingId.toString(), payment._id.toString());

  return { payment, booking: updatedBooking };
};

// Re-export including demo functions
Object.assign(module.exports, { getUpiData, demoConfirm });
