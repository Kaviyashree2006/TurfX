const User       = require('../models/User');
const Turf       = require('../models/Turf');
const Booking    = require('../models/Booking');
const Payment    = require('../models/Payment');
const Tournament = require('../models/Tournament');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { sendEmail } = require('../services/notification.service');

// ── Shared field projection for owner list/detail ─────────────────────────
const OWNER_FIELDS =
  'name email phone role approvalStatus rejectionReason resubmissionCount businessName businessAddress isActive createdAt updatedAt';

// ── Helper: serialise a Mongoose User doc to a plain owner object with `id` ──
// Mongoose's virtual `id` field is not reliably serialised unless toJSON
// virtuals are enabled. Map _id → id explicitly to match OwnerSummary on the frontend.
const serializeOwner = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  email: doc.email,
  phone: doc.phone ?? null,
  role: doc.role,
  approvalStatus: doc.approvalStatus,
  rejectionReason: doc.rejectionReason ?? null,
  resubmissionCount: doc.resubmissionCount ?? 0,
  businessName: doc.businessName ?? null,
  businessAddress: doc.businessAddress ?? null,
  isActive: doc.isActive,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

// ─── GET /api/admin/owners ────────────────────────────────────────────────────
// Returns all owner accounts. Query param: ?status=pending|approved|rejected
// Also supports ?search=<name or email substring>
const getOwners = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const filter = { role: 'owner' };

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.approvalStatus = status;
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { businessName: regex }];
  }

  const owners = await User.find(filter)
    .select(OWNER_FIELDS)
    .sort({ createdAt: -1 });

  return successResponse(res, { owners: owners.map(serializeOwner), total: owners.length });
});

// ─── GET /api/admin/owners/:id ────────────────────────────────────────────────
const getOwnerById = asyncHandler(async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: 'owner' }).select(OWNER_FIELDS);
  if (!owner) {
    return errorResponse(res, 'Owner not found.', 404, 'NOT_FOUND');
  }
  return successResponse(res, { owner: serializeOwner(owner) });
});

// ─── PATCH /api/admin/owners/:id/approve ─────────────────────────────────────
const approveOwner = asyncHandler(async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: 'owner' }).select(OWNER_FIELDS);
  if (!owner) {
    return errorResponse(res, 'Owner not found.', 404, 'NOT_FOUND');
  }
  if (owner.approvalStatus === 'approved') {
    return errorResponse(res, 'This owner account is already approved.', 409, 'ALREADY_APPROVED');
  }

  owner.approvalStatus = 'approved';
  owner.rejectionReason = null;
  await owner.save();

  // Notify owner by email (non-blocking — notification failure must not fail the request)
  await sendEmail({
    to: owner.email,
    subject: 'Your TurfX owner account has been approved!',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#16a34a;">Account approved 🎉</h2>
        <p>Hi ${owner.name},</p>
        <p>Great news — your TurfX turf owner account has been reviewed and <strong>approved</strong>.</p>
        <p>You can now log in and start listing your turfs, managing bookings, and running tournaments.</p>
        <a href="${process.env.CLIENT_URL}/owner/dashboard"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          Go to your dashboard
        </a>
        <p style="color:#6b7280;font-size:13px;">Welcome to TurfX!</p>
      </div>
    `,
  });

  return successResponse(res, { owner: serializeOwner(owner) }, 'Owner account approved successfully.');
});

// ─── PATCH /api/admin/owners/:id/reject ──────────────────────────────────────
const rejectOwner = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body; // validated by Joi before reaching here

  const owner = await User.findOne({ _id: req.params.id, role: 'owner' }).select(OWNER_FIELDS);
  if (!owner) {
    return errorResponse(res, 'Owner not found.', 404, 'NOT_FOUND');
  }
  if (owner.approvalStatus === 'rejected') {
    // Allow re-rejection with a new reason (admin may update the reason)
    // Fall through to update
  }

  owner.approvalStatus = 'rejected';
  owner.rejectionReason = rejectionReason.trim();
  await owner.save();

  await sendEmail({
    to: owner.email,
    subject: 'Update on your TurfX owner account application',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#dc2626;">Application update</h2>
        <p>Hi ${owner.name},</p>
        <p>Your TurfX turf owner application has been reviewed. Unfortunately, we were unable to approve it at this time.</p>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
          <strong>Reason:</strong><br/>
          ${owner.rejectionReason}
        </div>
        <p>You can correct the details mentioned above and resubmit your application from your account page.</p>
        <a href="${process.env.CLIENT_URL}/owner/pending-approval"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          Review and resubmit
        </a>
        <p style="color:#6b7280;font-size:13px;">If you have questions, please contact support.</p>
      </div>
    `,
  });

  return successResponse(res, { owner: serializeOwner(owner) }, 'Owner account rejected.');
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
const getAdminStats = asyncHandler(async (req, res) => {
  const [
    pendingOwners,
    activeTurfs,
    totalBookings,
    revenueAgg,
    upcomingTournaments,
  ] = await Promise.all([
    User.countDocuments({ role: 'owner', approvalStatus: 'pending' }),
    Turf.countDocuments({ status: 'approved', isActive: true }),
    Booking.countDocuments({ status: { $ne: 'pending_payment' } }),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Tournament.countDocuments({ status: { $in: ['upcoming', 'ongoing'] } }),
  ]);

  return successResponse(res, {
    pendingOwners,
    activeTurfs,
    totalBookings,
    platformRevenue: revenueAgg[0]?.total ?? 0,
    upcomingTournaments,
  });
});

module.exports = { getOwners, getOwnerById, approveOwner, rejectOwner, getAdminStats };
