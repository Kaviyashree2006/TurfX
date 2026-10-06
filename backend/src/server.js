require('./config/env'); // validates env vars first
const app       = require('./app');
const connectDB = require('./config/db');
const cron      = require('node-cron');
const { expireStalePendingBookings } = require('./services/booking.service');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  // ── 10-minute pending_payment expiry job (locked decision #5) ────────────
  // Runs every minute; marks stale pending_payment bookings as 'cancelled'
  // so the unique partial index slot is vacated and the turf time re-opens.
  // The Booking TTL index hard-deletes expired docs as a backstop, but this
  // job updates status first so the index clears synchronously.
  cron.schedule('* * * * *', async () => {
    try {
      await expireStalePendingBookings();
    } catch (err) {
      console.error('[Cron] Expiry job error:', err.message);
    }
  });
  console.log('[Cron] Booking expiry job started (every 1 minute).');

  app.listen(PORT, () => {
    console.log(`TurfX API listening on port ${PORT} [${process.env.NODE_ENV}]`);
  });
};

start();
