/**
 * tournament.service.js — Phase 5
 * Core business logic for tournaments and registrations.
 */

const Tournament             = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const Turf                   = require('../models/Turf');
const User                   = require('../models/User');
const { createNotification } = require('./notification.service');

// ── Guards ────────────────────────────────────────────────────────────────────

/**
 * Verify the requesting owner actually owns the turf referenced by the tournament.
 * Throws with statusCode if not.
 */
const assertOwnershipByTurf = async (turfId, userId) => {
  const turf = await Turf.findById(turfId).select('ownerId');
  if (!turf) {
    const e = new Error('Turf not found.'); e.statusCode = 404; e.code = 'NOT_FOUND'; throw e;
  }
  const ownerId = turf.ownerId?._id ? turf.ownerId._id.toString() : turf.ownerId?.toString();
  if (ownerId !== userId) {
    const e = new Error('You do not own this turf.'); e.statusCode = 403; e.code = 'FORBIDDEN'; throw e;
  }
};

const assertOwnershipByTournament = async (tournament, userId) => {
  const ownerId = tournament.ownerId?._id ? tournament.ownerId._id.toString() : tournament.ownerId?.toString();
  if (ownerId !== userId) {
    const e = new Error('You do not manage this tournament.'); e.statusCode = 403; e.code = 'FORBIDDEN'; throw e;
  }
};

// ── Registration logic ────────────────────────────────────────────────────────

/**
 * Register a customer for a tournament.
 * Guards: status must be 'upcoming', capacity not full, no duplicate.
 */
const register = async (tournamentId, userId, phone = '') => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    const e = new Error('Tournament not found.'); e.statusCode = 404; e.code = 'NOT_FOUND'; throw e;
  }
  if (tournament.status !== 'upcoming') {
    const e = new Error(`Cannot register for a tournament with status '${tournament.status}'.`);
    e.statusCode = 409; e.code = 'TOURNAMENT_NOT_REGISTERABLE'; throw e;
  }

  // Reject registration if the tournament date has already passed
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const tDate = new Date(tournament.date); tDate.setUTCHours(0, 0, 0, 0);
  if (tDate < today) {
    const e = new Error('Cannot register: this tournament date has already passed.');
    e.statusCode = 409; e.code = 'TOURNAMENT_DATE_PASSED'; throw e;
  }

  const count = await TournamentRegistration.countDocuments({ tournamentId });
  if (count >= tournament.maxParticipants) {
    const e = new Error('This tournament is full.'); e.statusCode = 409; e.code = 'TOURNAMENT_FULL'; throw e;
  }

  // Fallback to user profile phone if not explicitly provided
  let contactPhone = phone;
  if (!contactPhone) {
    const user = await User.findById(userId).select('phone');
    contactPhone = user?.phone || '';
  }

  // DB-level unique index catches duplicate — we surface a friendly error
  try {
    const reg = await TournamentRegistration.create({ tournamentId, userId, phone: contactPhone });

    // Non-blocking notification
    createNotification({
      userId,
      type:    'tournament_registered',
      title:   'Tournament Registration Confirmed',
      message: `You are registered for "${tournament.name}" on ${tournament.date}.`,
      refId:   tournament._id.toString(),
      refType: 'tournament',
    });

    return reg;
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('You are already registered for this tournament.');
      e.statusCode = 409; e.code = 'ALREADY_REGISTERED'; throw e;
    }
    throw err;
  }
};

/**
 * Cancel (withdraw) a customer's own registration.
 */
const unregister = async (tournamentId, userId) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    const e = new Error('Tournament not found.'); e.statusCode = 404; e.code = 'NOT_FOUND'; throw e;
  }
  if (tournament.status !== 'upcoming') {
    const e = new Error('Cannot withdraw from a tournament that has already started or ended.');
    e.statusCode = 409; e.code = 'TOURNAMENT_NOT_REGISTERABLE'; throw e;
  }
  const result = await TournamentRegistration.deleteOne({ tournamentId, userId });
  if (result.deletedCount === 0) {
    const e = new Error('You are not registered for this tournament.');
    e.statusCode = 404; e.code = 'NOT_REGISTERED'; throw e;
  }
};

// ── Participant count helper ──────────────────────────────────────────────────

const getParticipantCount = async (tournamentId) =>
  TournamentRegistration.countDocuments({ tournamentId });

const getParticipantCounts = async (tournamentIds) => {
  const agg = await TournamentRegistration.aggregate([
    { $match: { tournamentId: { $in: tournamentIds } } },
    { $group: { _id: '$tournamentId', count: { $sum: 1 } } },
  ]);
  const map = {};
  agg.forEach(({ _id, count }) => { map[_id.toString()] = count; });
  return map;
};

// ── Cancellation notifications ────────────────────────────────────────────────

/**
 * Notify all registered participants of a tournament cancellation.
 * Non-blocking — errors are swallowed.
 */
const notifyCancellation = async (tournament) => {
  try {
    const regs = await TournamentRegistration.find({ tournamentId: tournament._id }).select('userId');
    for (const reg of regs) {
      createNotification({
        userId:  reg.userId.toString(),
        type:    'tournament_cancelled',
        title:   'Tournament Cancelled',
        message: `"${tournament.name}" scheduled on ${tournament.date} has been cancelled.`,
        refId:   tournament._id.toString(),
        refType: 'tournament',
      });
    }
  } catch (err) {
    console.error('[tournament.service] notifyCancellation error:', err.message);
  }
};

module.exports = {
  assertOwnershipByTurf,
  assertOwnershipByTournament,
  register,
  unregister,
  getParticipantCount,
  getParticipantCounts,
  notifyCancellation,
};
