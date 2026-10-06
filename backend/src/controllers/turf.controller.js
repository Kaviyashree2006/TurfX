const Turf = require('../models/Turf');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { uploadTurfImage, deleteTurfImage } = require('../services/upload.service');
const { sendEmail } = require('../services/notification.service');

// ── Field projection for API responses ──────────────────────────────────────
const PUBLIC_FIELDS =
  'name description sportTypes address location images amenities operatingHours slotDurationMinutes pricing status ratingAvg ratingCount createdAt updatedAt';
const OWNER_FIELDS = PUBLIC_FIELDS + ' ownerId rejectionReason isActive';

// ── Helper: serialise a Turf doc to a plain object ───────────────────────────
const serializeTurf = (doc) => ({
  id:                  doc._id.toString(),
  ownerId:             doc.ownerId?.toString?.() ?? doc.ownerId,
  name:                doc.name,
  description:         doc.description,
  sportTypes:          doc.sportTypes,
  address:             doc.address,
  location:            doc.location,
  images:              doc.images,
  amenities:           doc.amenities,
  operatingHours:      doc.operatingHours,
  slotDurationMinutes: doc.slotDurationMinutes,
  pricing:             doc.pricing,
  status:              doc.status,
  isActive:            doc.isActive,
  rejectionReason:     doc.rejectionReason ?? null,
  ratingAvg:           doc.ratingAvg,
  ratingCount:         doc.ratingCount,
  createdAt:           doc.createdAt,
  updatedAt:           doc.updatedAt,
});

// ── Major fields that trigger re-review on an approved turf ─────────────────
const MAJOR_FIELDS = ['address', 'location', 'pricing', 'sportTypes', 'operatingHours'];

const majorFieldChanged = (incoming, existing) => {
  return MAJOR_FIELDS.some((field) => {
    if (!(field in incoming)) return false;
    return JSON.stringify(incoming[field]) !== JSON.stringify(existing[field]?.toObject?.() ?? existing[field]);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/turfs — approved + active only
const getPublicTurfs = asyncHandler(async (req, res) => {
  const { sport, city, search, page = 1, limit = 20 } = req.query;

  const filter = { status: 'approved', isActive: true };
  if (sport)  filter.sportTypes = sport;
  if (city)   filter['address.city'] = new RegExp(city.trim(), 'i');
  if (search) filter.$text = { $search: search.trim() };

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [turfs, total] = await Promise.all([
    Turf.find(filter).select(PUBLIC_FIELDS).sort({ ratingAvg: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    Turf.countDocuments(filter),
  ]);

  return successResponse(res, {
    turfs: turfs.map(serializeTurf),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// GET /api/turfs/:id — approved + active only
const getPublicTurfById = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne({ _id: req.params.id, status: 'approved', isActive: true })
    .select(PUBLIC_FIELDS);
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');
  return successResponse(res, { turf: serializeTurf(turf) });
});

// ─────────────────────────────────────────────────────────────────────────────
// OWNER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/owner/turfs — owner's own turfs (all statuses)
const getOwnerTurfs = asyncHandler(async (req, res) => {
  const turfs = await Turf.find({ ownerId: req.user.userId })
    .select(OWNER_FIELDS)
    .sort({ createdAt: -1 });
  return successResponse(res, { turfs: turfs.map(serializeTurf), total: turfs.length });
});

// GET /api/owner/turfs/:id
const getOwnerTurfById = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne({ _id: req.params.id, ownerId: req.user.userId })
    .select(OWNER_FIELDS);
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');
  return successResponse(res, { turf: serializeTurf(turf) });
});

// POST /api/turfs — owner creates turf (no images at creation; add via upload endpoint)
const createTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.create({
    ...req.body,
    ownerId: req.user.userId,
    status: 'pending',
    isActive: true,
  });
  return successResponse(res, { turf: serializeTurf(turf) }, 'Turf created and submitted for review.', 201);
});

// PUT /api/turfs/:id — owner updates turf (major field change → re-review)
const updateTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne({ _id: req.params.id, ownerId: req.user.userId });
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');

  const incoming = req.body;
  const wasPreviouslyApproved = turf.status === 'approved';
  const needsReReview = wasPreviouslyApproved && majorFieldChanged(incoming, turf);

  // Apply all incoming fields
  Object.assign(turf, incoming);

  if (needsReReview) {
    turf.status = 'pending';
    turf.rejectionReason = null;
  }

  await turf.save();
  return successResponse(
    res,
    { turf: serializeTurf(turf), resubmittedForReview: needsReReview },
    needsReReview ? 'Turf updated. Major changes require admin re-approval.' : 'Turf updated successfully.'
  );
});

// DELETE /api/turfs/:id — owner deletes turf (also removes Cloudinary images)
const deleteTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne({ _id: req.params.id, ownerId: req.user.userId });
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');

  // Best-effort cleanup of Cloudinary images
  await Promise.allSettled((turf.images || []).map((url) => deleteTurfImage(url)));

  await turf.deleteOne();
  return successResponse(res, {}, 'Turf deleted successfully.');
});

// PATCH /api/turfs/:id/toggle-active — owner enables/disables turf
const toggleTurfActive = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne({ _id: req.params.id, ownerId: req.user.userId });
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');

  turf.isActive = !turf.isActive;
  await turf.save();

  return successResponse(
    res,
    { turf: serializeTurf(turf) },
    `Turf ${turf.isActive ? 'enabled' : 'disabled'} successfully.`
  );
});

// POST /api/turfs/:id/images — upload images (multipart/form-data, field name: images)
const uploadImages = asyncHandler(async (req, res) => {
  const turf = await Turf.findOne({ _id: req.params.id, ownerId: req.user.userId });
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');

  if (!req.files || req.files.length === 0) {
    return errorResponse(res, 'No images provided.', 422, 'NO_IMAGES');
  }

  if (turf.images.length + req.files.length > 8) {
    return errorResponse(res, 'A turf can have at most 8 images.', 422, 'TOO_MANY_IMAGES');
  }

  const uploads = await Promise.all(
    req.files.map((f) => uploadTurfImage(f.buffer, f.mimetype))
  );

  turf.images.push(...uploads.map((u) => u.url));
  await turf.save();

  return successResponse(res, { images: turf.images }, 'Images uploaded successfully.');
});

// DELETE /api/turfs/:id/images — remove a specific image by URL
const deleteImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return errorResponse(res, 'imageUrl is required.', 422, 'MISSING_IMAGE_URL');

  const turf = await Turf.findOne({ _id: req.params.id, ownerId: req.user.userId });
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');

  if (!turf.images.includes(imageUrl)) {
    return errorResponse(res, 'Image not found on this turf.', 404, 'IMAGE_NOT_FOUND');
  }

  await deleteTurfImage(imageUrl);
  turf.images = turf.images.filter((u) => u !== imageUrl);
  await turf.save();

  return successResponse(res, { images: turf.images }, 'Image removed.');
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN TURF ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_FIELDS = OWNER_FIELDS;

// GET /api/admin/turfs — all turfs with ?status filter
const adminGetTurfs = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status;
  }
  if (search && search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [turfs, total] = await Promise.all([
    Turf.find(filter)
      .select(ADMIN_FIELDS)
      .populate('ownerId', 'name email businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Turf.countDocuments(filter),
  ]);

  return successResponse(res, {
    turfs: turfs.map((t) => ({
      ...serializeTurf(t),
      owner: t.ownerId
        ? { id: t.ownerId._id?.toString(), name: t.ownerId.name, email: t.ownerId.email, businessName: t.ownerId.businessName }
        : null,
    })),
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// GET /api/admin/turfs/:id
const adminGetTurfById = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id)
    .select(ADMIN_FIELDS)
    .populate('ownerId', 'name email businessName phone');
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');
  return successResponse(res, {
    turf: {
      ...serializeTurf(turf),
      owner: turf.ownerId
        ? { id: turf.ownerId._id?.toString(), name: turf.ownerId.name, email: turf.ownerId.email, businessName: turf.ownerId.businessName, phone: turf.ownerId.phone }
        : null,
    },
  });
});

// PATCH /api/admin/turfs/:id/approve
const adminApproveTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id).populate('ownerId', 'name email');
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');
  if (turf.status === 'approved') {
    return errorResponse(res, 'Turf is already approved.', 409, 'ALREADY_APPROVED');
  }

  turf.status = 'approved';
  turf.rejectionReason = null;
  await turf.save();

  await sendEmail({
    to: turf.ownerId?.email,
    subject: `Your turf "${turf.name}" has been approved on TurfX!`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#16a34a;">Turf listing approved 🎉</h2>
      <p>Hi ${turf.ownerId?.name ?? 'there'},</p>
      <p>Great news — your turf listing <strong>${turf.name}</strong> has been approved and is now publicly visible on TurfX.</p>
      <a href="${process.env.CLIENT_URL}/owner/turfs" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View your turfs</a>
    </div>`,
  });

  return successResponse(res, { turf: serializeTurf(turf) }, 'Turf approved and published.');
});

// PATCH /api/admin/turfs/:id/reject
const adminRejectTurf = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;
  const turf = await Turf.findById(req.params.id).populate('ownerId', 'name email');
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');

  turf.status = 'rejected';
  turf.rejectionReason = rejectionReason.trim();
  await turf.save();

  await sendEmail({
    to: turf.ownerId?.email,
    subject: `Update on your TurfX listing: "${turf.name}"`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#dc2626;">Listing not approved</h2>
      <p>Hi ${turf.ownerId?.name ?? 'there'},</p>
      <p>Your turf listing <strong>${turf.name}</strong> could not be approved at this time.</p>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
        <strong>Reason:</strong><br/>${turf.rejectionReason}
      </div>
      <p>Please update your listing and resubmit for review.</p>
      <a href="${process.env.CLIENT_URL}/owner/turfs/${turf._id}/edit" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Edit and resubmit</a>
    </div>`,
  });

  return successResponse(res, { turf: serializeTurf(turf) }, 'Turf listing rejected.');
});

// PATCH /api/admin/turfs/:id/suspend — admin disables a turf (sets isActive=false without changing status)
const adminSuspendTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id);
  if (!turf) return errorResponse(res, 'Turf not found.', 404, 'NOT_FOUND');

  turf.isActive = !turf.isActive;
  await turf.save();

  return successResponse(
    res,
    { turf: serializeTurf(turf) },
    `Turf ${turf.isActive ? 'unsuspended' : 'suspended'} successfully.`
  );
});

module.exports = {
  getPublicTurfs,
  getPublicTurfById,
  getOwnerTurfs,
  getOwnerTurfById,
  createTurf,
  updateTurf,
  deleteTurf,
  toggleTurfActive,
  uploadImages,
  deleteImage,
  adminGetTurfs,
  adminGetTurfById,
  adminApproveTurf,
  adminRejectTurf,
  adminSuspendTurf,
};
