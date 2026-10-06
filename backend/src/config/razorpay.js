/**
 * Razorpay SDK instance — deferred initialisation.
 * The instance is created lazily on first use so the app still starts
 * when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not yet configured.
 * All payment service calls check that the env vars are present before
 * calling getRazorpay(), so the warning is surfaced at request time.
 */
const Razorpay = require('razorpay');

let _instance = null;

const getRazorpay = () => {
  if (_instance) return _instance;

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const err = new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    err.statusCode = 503;
    err.code = 'RAZORPAY_NOT_CONFIGURED';
    throw err;
  }

  _instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _instance;
};

module.exports = { getRazorpay };
