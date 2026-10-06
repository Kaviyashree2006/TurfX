const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const errorMiddleware = require('./middlewares/error.middleware');
const authRoutes    = require('./routes/auth.routes');
const adminRoutes   = require('./routes/admin.routes');
const turfRoutes    = require('./routes/turf.routes');
const ownerRoutes   = require('./routes/owner.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes     = require('./routes/payment.routes');
const tournamentRoutes  = require('./routes/tournament.routes');
const reviewRoutes       = require('./routes/review.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// ─── Security headers (Doc 09) ────────────────────────────────────────────────
app.use(helmet());

// ─── CORS: only allow the configured frontend origin (Doc 09) ─────────────────
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true, // needed for the httpOnly refresh-token cookie
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
// Capture raw body for Razorpay webhook signature verification BEFORE json parse.
app.use((req, _res, next) => {
  if (req.path === '/api/payments/webhook') {
    let data = [];
    req.on('data', (chunk) => data.push(chunk));
    req.on('end',  ()      => { req.rawBody = Buffer.concat(data); next(); });
  } else {
    next();
  }
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Cookie parsing (for refresh-token cookie) ────────────────────────────────
app.use(cookieParser());

// ─── Request logging (avoid logging PII in production — Doc 05) ──────────────
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'TurfX API is running.', env: env.NODE_ENV });
});

// ─── Public settings (platform fee — read-only, no auth needed) ──────────────
app.get('/api/settings/public', async (req, res) => {
  const { getSettings } = require('./services/settings.service');
  const s = await getSettings();
  res.json({ success: true, data: { platformFeePercent: s.platformFeePercent ?? 5 } });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/turfs',   turfRoutes);
app.use('/api/owner',   ownerRoutes);
app.use('/api/bookings',    bookingRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/reviews',        reviewRoutes);
app.use('/api/notifications',  notificationRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.', code: 'NOT_FOUND' });
});

// ─── Central error handler ────────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
