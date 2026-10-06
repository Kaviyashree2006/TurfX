const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const optionalAuth   = authMiddleware.optionalAuth;
const roleMiddleware = require('../middlewares/role.middleware');
const validate       = require('../middlewares/validate.middleware');
const { createTournamentSchema, updateTournamentSchema, registerSchema } = require('../validators/tournament.validators');
const ctrl = require('../controllers/tournament.controller');

// ── PUBLIC — no auth required ─────────────────────────────────────────────────
// NOTE: /my and /:id/register must come BEFORE /:id to avoid param capture.

// GET /api/tournaments  — list all (optionally filtered by status)
router.get('/', ctrl.listTournaments);

// GET /api/tournaments/my — customer's own registrations  (auth required)
router.get('/my',
  authMiddleware, roleMiddleware(['customer']),
  ctrl.getMyRegistrations
);

// GET /api/tournaments/:id — public detail (optional auth for isRegistered flag)
router.get('/:id', optionalAuth, ctrl.getTournament);

// POST /api/tournaments/:id/register — customer registers
router.post('/:id/register',
  authMiddleware, roleMiddleware(['customer']),
  validate(registerSchema),
  ctrl.registerForTournament
);

// DELETE /api/tournaments/:id/register — customer withdraws
router.delete('/:id/register',
  authMiddleware, roleMiddleware(['customer']),
  ctrl.unregisterFromTournament
);

module.exports = router;
