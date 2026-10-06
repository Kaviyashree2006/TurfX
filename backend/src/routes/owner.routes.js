/**
 * Owner-namespaced routes: /api/owner/*
 * All require: auth + role('owner') + ownerApproved
 */
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const ownerApproved  = require('../middlewares/ownerApproved.middleware');
const validate       = require('../middlewares/validate.middleware');
const { getOwnerTurfs, getOwnerTurfById } = require('../controllers/turf.controller');
const { getOwnerBookings, ownerCancelBooking } = require('../controllers/booking.controller');
const { cancelBookingSchema } = require('../validators/booking.validators');
const {
  getOwnerTournaments,
  getOwnerTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  getParticipants,
} = require('../controllers/tournament.controller');
const { createTournamentSchema, updateTournamentSchema } = require('../validators/tournament.validators');
const { getOwnerTurfReviews } = require('../controllers/review.controller');

router.use(authMiddleware, roleMiddleware(['owner']), ownerApproved);

// GET /api/owner/turfs
router.get('/turfs', getOwnerTurfs);
// GET /api/owner/turfs/:id/reviews — must come before /turfs/:id
router.get('/turfs/:id/reviews', getOwnerTurfReviews);
// GET /api/owner/turfs/:id
router.get('/turfs/:id', getOwnerTurfById);

// ── Bookings (Phase 3) ─────────────────────────────────────────────────────
// GET  /api/owner/bookings  — all bookings across owner's turfs
// PATCH /api/owner/bookings/:id/cancel
router.get('/bookings', getOwnerBookings);
router.patch('/bookings/:id/cancel', validate(cancelBookingSchema), ownerCancelBooking);

// ── Tournaments (Phase 5) ─────────────────────────────────────────────────────
router.get('/tournaments',                  getOwnerTournaments);
router.post('/tournaments',                 validate(createTournamentSchema), createTournament);
router.get('/tournaments/:id/participants', getParticipants);
router.get('/tournaments/:id',              getOwnerTournamentById);
router.put('/tournaments/:id',              validate(updateTournamentSchema), updateTournament);
router.delete('/tournaments/:id',           deleteTournament);

module.exports = router;
