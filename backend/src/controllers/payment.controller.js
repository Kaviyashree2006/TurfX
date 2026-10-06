const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const paymentService = require('../services/payment.service');
const Payment = require('../models/Payment');

// POST /api/payments/create-order
const createOrder = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  const { rzpOrder, payment } = await paymentService.createOrder(bookingId, req.user.userId);
  return successResponse(res, {
    orderId:        rzpOrder.id,
    amount:         rzpOrder.amount,       // paise
    currency:       rzpOrder.currency,
    paymentId:      payment._id.toString(),
    keyId:          process.env.RAZORPAY_KEY_ID,
  }, 'Order created.', 201);
});

// POST /api/payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
  const { payment, booking } = await paymentService.verifyAndConfirm({
    orderId, razorpayPaymentId, razorpaySignature,
    userId: req.user.userId,
  });
  return successResponse(res, {
    payment: paymentService.serializePayment(payment),
    bookingStatus: booking.status,
    bookingId: booking._id.toString(),
  }, 'Payment verified. Booking confirmed.');
});

// POST /api/payments/webhook — raw body, no auth
const webhook = asyncHandler(async (req, res) => {
  const sig = req.headers['x-razorpay-signature'] || '';
  const result = await paymentService.handleWebhook(req.rawBody, sig);
  return res.status(200).json({ success: true, ...result });
});

// GET /api/payments/:id — customer (own) or admin
const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return errorResponse(res, 'Payment not found.', 404, 'NOT_FOUND');
  const isOwn   = payment.userId?.toString() === req.user.userId;
  const isAdmin = req.user.role === 'admin';
  if (!isOwn && !isAdmin) return errorResponse(res, 'Forbidden.', 403, 'FORBIDDEN');
  return successResponse(res, { payment: paymentService.serializePayment(payment) });
});

// GET /api/admin/payments
const adminGetPayments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('bookingId', 'date startTime endTime sport amount turfId'),
    Payment.countDocuments(filter),
  ]);
  return successResponse(res, {
    payments: payments.map(paymentService.serializePayment),
    total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)),
  });
});

module.exports = { createOrder, verifyPayment, webhook, getPayment, adminGetPayments };

// ─── Demo UPI endpoints ───────────────────────────────────────────────────────

// GET /api/payments/upi-data/:bookingId
const getUpiData = asyncHandler(async (req, res) => {
  const data = await paymentService.getUpiData(req.params.bookingId, req.user.userId);
  return successResponse(res, data);
});

// POST /api/payments/demo-confirm
const demoConfirm = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) return errorResponse(res, 'bookingId is required.', 422, 'VALIDATION_ERROR');
  const { payment, booking } = await paymentService.demoConfirm(bookingId, req.user.userId);
  return successResponse(res, {
    payment: paymentService.serializePayment(payment),
    bookingStatus: booking.status,
    bookingId: booking._id.toString(),
  }, 'Demo payment confirmed. Booking is now confirmed.');
});

Object.assign(module.exports, { getUpiData, demoConfirm });
