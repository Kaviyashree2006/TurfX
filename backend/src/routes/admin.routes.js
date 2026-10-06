const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { rejectOwnerSchema } = require('../validators/admin.validators');
const { rejectTurfSchema }  = require('../validators/turf.validators');
const { getOwners, getOwnerById, approveOwner, rejectOwner, getAdminStats } = require('../controllers/admin.controller');
const {
  adminGetTurfs,
  adminGetTurfById,
  adminApproveTurf,
  adminRejectTurf,
  adminSuspendTurf,
} = require('../controllers/turf.controller');
const { adminGetBookings } = require('../controllers/booking.controller');
const { adminGetPayments } = require('../controllers/payment.controller');
const { adminGetTournaments, adminUpdateStatus, adminDeleteTournament } = require('../controllers/tournament.controller');
const { adminGetReviews, adminDeleteReview } = require('../controllers/review.controller');

// All admin routes: must be authenticated AND have role 'admin'
router.use(authMiddleware, roleMiddleware(['admin']));

// ── Stats (Dashboard) — must be before any /:param routes ─────────────────
router.get('/stats', getAdminStats);

// ── Owner approval (Phase 1) ──────────────────────────────────────────────
// GET  /api/admin/owners           — list all owners (filter by ?status=pending|approved|rejected, ?search=)
// GET  /api/admin/owners/pending   — convenience alias: always filters to pending
// GET  /api/admin/owners/:id       — owner detail
// PATCH /api/admin/owners/:id/approve
// PATCH /api/admin/owners/:id/reject

router.get('/owners', getOwners);

// /owners/pending must come BEFORE /owners/:id so 'pending' isn't treated as an :id
router.get('/owners/pending', (req, res, next) => {
  req.query.status = 'pending';
  next();
}, getOwners);

router.get('/owners/:id', getOwnerById);
router.patch('/owners/:id/approve', approveOwner);
router.patch('/owners/:id/reject', validate(rejectOwnerSchema), rejectOwner);

// ── Turf approval (Phase 2) ───────────────────────────────────────────────
// /turfs/pending must come before /turfs/:id
router.get('/turfs', adminGetTurfs);
router.get('/turfs/pending', (req, res, next) => {
  req.query.status = 'pending';
  next();
}, adminGetTurfs);
router.get('/turfs/:id', adminGetTurfById);
router.patch('/turfs/:id/approve',  adminApproveTurf);
router.patch('/turfs/:id/reject',   validate(rejectTurfSchema), adminRejectTurf);
router.patch('/turfs/:id/suspend',  adminSuspendTurf);

// ── Bookings (Phase 3) ───────────────────────────────────────────────────
router.get('/bookings', adminGetBookings);

// ── Payments (Phase 4) ───────────────────────────────────────────────────
router.get('/payments', adminGetPayments);

// ── Tournaments (Phase 5) ────────────────────────────────────────────────
router.get('/tournaments', adminGetTournaments);
router.patch('/tournaments/:id/status', adminUpdateStatus);
router.delete('/tournaments/:id', adminDeleteTournament);

// ── Reviews (Phase 6) ────────────────────────────────────────────────────
router.get('/reviews', adminGetReviews);
router.delete('/reviews/:id', adminDeleteReview);

module.exports = router;
