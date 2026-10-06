/**
 * tournament.controller.js — Phase 5
 *
 * Route map:
 *   PUBLIC
 *     GET  /api/tournaments              → listTournaments
 *     GET  /api/tournaments/:id          → getTournament
 *   CUSTOMER (auth + role customer)
 *     POST   /api/tournaments/:id/register   → registerForTournament
 *     DELETE /api/tournaments/:id/register   → unregisterFromTournament
 *     GET    /api/tournaments/my             → getMyRegistrations
 *   OWNER (auth + role owner + ownerApproved, via owner.routes.js)
 *     GET    /api/owner/tournaments          → getOwnerTournaments
 *     POST   /api/owner/tournaments          → createTournament
 *     PUT    /api/owner/tournaments/:id      → updateTournament
 *     DELETE /api/owner/tournaments/:id      → deleteTournament
 *     GET    /api/owner/tournaments/:id/participants → getParticipants
 *   ADMIN
 *     GET    /api/admin/tournaments          → adminGetTournaments
 *     PATCH  /api/admin/tournaments/:id/status → adminUpdateStatus
 */

const Tournament             = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const asyncHandler           = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const tournamentService      = require('../services/tournament.service');

// ── Serializer ────────────────────────────────────────────────────────────────

const serializeTournament = (doc, participantCount = 0, isRegistered = false) => {
  const turf  = doc.turfId  && typeof doc.turfId  === 'object' ? doc.turfId  : null;
  const owner = doc.ownerId && typeof doc.ownerId === 'object' ? doc.ownerId : null;
  return {
    id:              doc._id.toString(),
    turfId:          turf  ? turf._id.toString()  : doc.turfId?.toString(),
    ownerId:         owner ? owner._id.toString() : doc.ownerId?.toString(),
    name:            doc.name,
    description:     doc.description,
    sport:           doc.sport,
    date:            doc.date,
    startTime:       doc.startTime,
    endTime:         doc.endTime,
    maxParticipants: doc.maxParticipants,
    entryFee:        doc.entryFee,
    prizeInfo:       doc.prizeInfo,
    status:          doc.status,
    participantCount,
    isRegistered,
    createdAt:       doc.createdAt,
    updatedAt:       doc.updatedAt,
    // Populated relations
    turf: turf ? {
      id:      turf._id.toString(),
      name:    turf.name,
      address: turf.address,
      images:  turf.images ?? [],
    } : null,
    owner: owner ? {
      id:    owner._id.toString(),
      name:  owner.name,
      email: owner.email,
    } : null,
  };
};

const TOURNAMENT_POPULATE = [
  { path: 'turfId',  select: 'name address images ownerId' },
  { path: 'ownerId', select: 'name email' },
];

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// GET /api/tournaments?status=upcoming&page=1
const listTournaments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  // Auto-advance: mark any 'upcoming' or 'ongoing' tournaments whose date has
  // passed as 'completed' so the listings stay accurate without a cron job.
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  await Tournament.updateMany(
    { status: { $in: ['upcoming', 'ongoing'] }, date: { $lt: today.toISOString().slice(0, 10) } },
    { $set: { status: 'completed' } }
  );

  const filter = {};
  if (status) filter.status = status;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [tournaments, total] = await Promise.all([
    Tournament.find(filter)
      .populate(TOURNAMENT_POPULATE)
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Tournament.countDocuments(filter),
  ]);

  const ids = tournaments.map(t => t._id);
  const counts = await tournamentService.getParticipantCounts(ids);

  return successResponse(res, {
    tournaments: tournaments.map(t =>
      serializeTournament(t, counts[t._id.toString()] ?? 0)
    ),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// GET /api/tournaments/:id
const getTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id).populate(TOURNAMENT_POPULATE);
  if (!tournament) return errorResponse(res, 'Tournament not found.', 404, 'NOT_FOUND');

  const count = await tournamentService.getParticipantCount(tournament._id);

  // If caller is an authenticated customer, check registration status
  let isRegistered = false;
  if (req.user?.userId && req.user?.role === 'customer') {
    const reg = await TournamentRegistration.findOne({
      tournamentId: tournament._id,
      userId: req.user.userId,
    });
    isRegistered = !!reg;
  }

  return successResponse(res, { tournament: serializeTournament(tournament, count, isRegistered) });
});

// ── CUSTOMER ──────────────────────────────────────────────────────────────────

// GET /api/tournaments/my  — customer's own registrations
const getMyRegistrations = asyncHandler(async (req, res) => {
  const regs = await TournamentRegistration.find({ userId: req.user.userId })
    .populate({ path: 'tournamentId', populate: TOURNAMENT_POPULATE })
    .sort({ createdAt: -1 });

  const live = regs.filter(r => r.tournamentId); // guard against deleted tournaments
  return successResponse(res, {
    registrations: live.map(r => ({
      id:           r._id.toString(),
      phone:        r.phone,
      registeredAt: r.createdAt,
      tournament:   serializeTournament(r.tournamentId, 0),
    })),
    total: live.length,
  });
});

// POST /api/tournaments/:id/register
const registerForTournament = asyncHandler(async (req, res) => {
  const { phone = '' } = req.body;
  const reg = await tournamentService.register(req.params.id, req.user.userId, phone);
  return successResponse(res, { registrationId: reg._id.toString() }, 'Registered successfully.', 201);
});

// DELETE /api/tournaments/:id/register
const unregisterFromTournament = asyncHandler(async (req, res) => {
  await tournamentService.unregister(req.params.id, req.user.userId);
  return successResponse(res, {}, 'Registration cancelled.');
});

// ── OWNER ─────────────────────────────────────────────────────────────────────

// GET /api/owner/tournaments
const getOwnerTournaments = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({ ownerId: req.user.userId })
    .populate(TOURNAMENT_POPULATE)
    .sort({ date: -1 });

  const ids = tournaments.map(t => t._id);
  const counts = await tournamentService.getParticipantCounts(ids);

  return successResponse(res, {
    tournaments: tournaments.map(t =>
      serializeTournament(t, counts[t._id.toString()] ?? 0)
    ),
    total: tournaments.length,
  });
});

// GET /api/owner/tournaments/:id
const getOwnerTournamentById = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id).populate(TOURNAMENT_POPULATE);
  if (!tournament) return errorResponse(res, 'Tournament not found.', 404, 'NOT_FOUND');
  await tournamentService.assertOwnershipByTournament(tournament, req.user.userId);

  const count = await tournamentService.getParticipantCount(tournament._id);
  return successResponse(res, { tournament: serializeTournament(tournament, count) });
});

// POST /api/owner/tournaments
const createTournament = asyncHandler(async (req, res) => {
  const { turfId, name, description, sport, date, startTime, endTime,
          maxParticipants, entryFee, prizeInfo } = req.body;

  // Reject past dates
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const requested = new Date(date); requested.setUTCHours(0, 0, 0, 0);
  if (requested < today) {
    return errorResponse(res, 'Tournament date cannot be in the past.', 422, 'PAST_DATE');
  }

  await tournamentService.assertOwnershipByTurf(turfId, req.user.userId);

  const tournament = await Tournament.create({
    turfId, ownerId: req.user.userId,
    name, description, sport, date, startTime, endTime,
    maxParticipants, entryFee, prizeInfo,
  });

  const populated = await Tournament.findById(tournament._id).populate(TOURNAMENT_POPULATE);
  return successResponse(res, { tournament: serializeTournament(populated, 0) }, 'Tournament created.', 201);
});

// PUT /api/owner/tournaments/:id
const updateTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return errorResponse(res, 'Tournament not found.', 404, 'NOT_FOUND');
  await tournamentService.assertOwnershipByTournament(tournament, req.user.userId);

  if (tournament.status === 'cancelled') {
    return errorResponse(res, 'Cannot edit a cancelled tournament.', 409, 'TOURNAMENT_CANCELLED');
  }

  // Reject changing date to a past value
  if (req.body.date !== undefined) {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const requested = new Date(req.body.date); requested.setUTCHours(0, 0, 0, 0);
    if (requested < today) {
      return errorResponse(res, 'Tournament date cannot be in the past.', 422, 'PAST_DATE');
    }
  }

  if (req.body.maxParticipants !== undefined) {
    const currentCount = await tournamentService.getParticipantCount(tournament._id);
    if (req.body.maxParticipants < currentCount) {
      return errorResponse(
        res,
        `Cannot reduce capacity to ${req.body.maxParticipants}; ${currentCount} participants are already registered.`,
        409,
        'CAPACITY_TOO_LOW'
      );
    }
  }

  const allowed = [
    'name', 'description', 'sport', 'date', 'startTime', 'endTime',
    'maxParticipants', 'entryFee', 'prizeInfo', 'status',
  ];
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) tournament[k] = req.body[k];
  });
  await tournament.save();

  const populated = await Tournament.findById(tournament._id).populate(TOURNAMENT_POPULATE);
  const count = await tournamentService.getParticipantCount(tournament._id);
  return successResponse(res, { tournament: serializeTournament(populated, count) }, 'Tournament updated.');
});

// DELETE /api/owner/tournaments/:id
const deleteTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return errorResponse(res, 'Tournament not found.', 404, 'NOT_FOUND');
  await tournamentService.assertOwnershipByTournament(tournament, req.user.userId);

  // Soft-cancel instead of hard delete if there are registrations
  const count = await tournamentService.getParticipantCount(tournament._id);
  if (count > 0) {
    tournament.status = 'cancelled';
    await tournament.save();
    tournamentService.notifyCancellation(tournament); // non-blocking
    return successResponse(res, {}, 'Tournament cancelled (participants were registered).');
  }

  await tournament.deleteOne();
  return successResponse(res, {}, 'Tournament deleted.');
});

// GET /api/owner/tournaments/:id/participants
const getParticipants = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id).select('ownerId name');
  if (!tournament) return errorResponse(res, 'Tournament not found.', 404, 'NOT_FOUND');
  await tournamentService.assertOwnershipByTournament(tournament, req.user.userId);

  const regs = await TournamentRegistration.find({ tournamentId: req.params.id })
    .populate('userId', 'name email phone')
    .sort({ createdAt: 1 });

  return successResponse(res, {
    tournamentName: tournament.name,
    participants: regs.map(r => ({
      id:           r._id.toString(),
      phone:        r.phone,
      registeredAt: r.createdAt,
      user: r.userId ? {
        id:    r.userId._id.toString(),
        name:  r.userId.name,
        email: r.userId.email,
        phone: r.userId.phone ?? null,
      } : null,
    })),
    total: regs.length,
  });
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────

// GET /api/admin/tournaments?status=&page=
const adminGetTournaments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [tournaments, total] = await Promise.all([
    Tournament.find(filter)
      .populate(TOURNAMENT_POPULATE)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Tournament.countDocuments(filter),
  ]);

  const ids = tournaments.map(t => t._id);
  const counts = await tournamentService.getParticipantCounts(ids);

  return successResponse(res, {
    tournaments: tournaments.map(t =>
      serializeTournament(t, counts[t._id.toString()] ?? 0)
    ),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// PATCH /api/admin/tournaments/:id/status
const adminUpdateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['upcoming', 'ongoing', 'completed', 'cancelled'];
  if (!status || !allowed.includes(status)) {
    return errorResponse(res, `status must be one of: ${allowed.join(', ')}.`, 422, 'VALIDATION_ERROR');
  }

  const tournament = await Tournament.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate(TOURNAMENT_POPULATE);

  if (!tournament) return errorResponse(res, 'Tournament not found.', 404, 'NOT_FOUND');
  const count = await tournamentService.getParticipantCount(tournament._id);
  if (status === 'cancelled') tournamentService.notifyCancellation(tournament); // non-blocking
  return successResponse(res, { tournament: serializeTournament(tournament, count) }, 'Status updated.');
});

// DELETE /api/admin/tournaments/:id
const adminDeleteTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return errorResponse(res, 'Tournament not found.', 404, 'NOT_FOUND');

  const count = await tournamentService.getParticipantCount(tournament._id);
  if (count > 0) {
    tournament.status = 'cancelled';
    await tournament.save();
    tournamentService.notifyCancellation(tournament); // non-blocking
    return successResponse(res, {}, 'Tournament cancelled (participants were registered).');
  }

  await tournament.deleteOne();
  return successResponse(res, {}, 'Tournament deleted.');
});

module.exports = {
  listTournaments,
  getTournament,
  getMyRegistrations,
  registerForTournament,
  unregisterFromTournament,
  getOwnerTournaments,
  getOwnerTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  getParticipants,
  adminGetTournaments,
  adminUpdateStatus,
  adminDeleteTournament,
};
