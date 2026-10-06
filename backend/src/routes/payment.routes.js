const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const validate       = require('../middlewares/validate.middleware');
const { createOrderSchema, verifyPaymentSchema } = require('../validators/payment.validators');
const ctrl = require('../controllers/payment.controller');

// ── Razorpay routes (preserved — restore when credentials are available) ──────
router.post('/create-order',
  authMiddleware, roleMiddleware(['customer']),
  validate(createOrderSchema),
  ctrl.createOrder
);

router.post('/verify',
  authMiddleware, roleMiddleware(['customer']),
  validate(verifyPaymentSchema),
  ctrl.verifyPayment
);

// Webhook — no user auth; raw body captured in app.js
router.post('/webhook', ctrl.webhook);

// ── Demo UPI routes ────────────────────────────────────────────────────────────
// These MUST appear before /:id so Express doesn't treat 'upi-data' as an id.

// GET /api/payments/upi-data/:bookingId — returns UPI URI + metadata for QR panel
router.get('/upi-data/:bookingId', authMiddleware, roleMiddleware(['customer']), ctrl.getUpiData);

// POST /api/payments/demo-confirm — manual "I paid" button (demo only)
router.post('/demo-confirm',
  authMiddleware, roleMiddleware(['customer']),
  ctrl.demoConfirm
);

// ── Generic by-id — must stay LAST ────────────────────────────────────────────
router.get('/:id', authMiddleware, ctrl.getPayment);

module.exports = router;
