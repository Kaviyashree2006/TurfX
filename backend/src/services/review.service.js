/**
 * review.service.js — Phase 6
 * Recalculates and denormalises ratingAvg + ratingCount on the Turf document
 * after every create / update / delete so the public turf list stays accurate.
 */
const Review = require('../models/Review');
const Turf   = require('../models/Turf');

/**
 * Recompute and persist ratingAvg + ratingCount for a turf.
 * Called after any review mutation.
 */
const recalcRating = async (turfId) => {
  const mongoose = require('mongoose');
  let oid;
  try {
    oid = new mongoose.Types.ObjectId(turfId.toString());
  } catch {
    // Malformed turfId — skip silently, do not corrupt the Turf document
    return;
  }

  const agg = await Review.aggregate([
    { $match: { turfId: oid } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const avg   = agg[0]?.avg   ?? 0;
  const count = agg[0]?.count ?? 0;

  await Turf.findByIdAndUpdate(turfId, {
    ratingAvg:   Math.round(avg * 10) / 10,
    ratingCount: count,
  });
};

module.exports = { recalcRating };
