const express = require('express');
const router = express.Router();

const authMiddleware       = require('../middlewares/auth.middleware');
const roleMiddleware       = require('../middlewares/role.middleware');
const ownerApproved        = require('../middlewares/ownerApproved.middleware');
const validate             = require('../middlewares/validate.middleware');
const upload               = require('../middlewares/upload.middleware');

const { createTurfSchema, updateTurfSchema } = require('../validators/turf.validators');

const {
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
} = require('../controllers/turf.controller');

const { getTurfAvailability } = require('../controllers/booking.controller');
const { getTurfReviews }     = require('../controllers/review.controller');

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', getPublicTurfs);
// availability and reviews MUST come before /:id
router.get('/:id/availability', getTurfAvailability);
router.get('/:id/reviews', getTurfReviews);
router.get('/:id', getPublicTurfById);

// ─── Owner — own turfs list ───────────────────────────────────────────────────
// Separate path prefix /owner/turfs is mounted in app.js;
// these routes are prefixed /api/owner/turfs from the app perspective.
// Here we export the owner-routes for the /api/turfs base to keep things DRY.

// Owner write: auth + role + approvalStatus check
router.post(
  '/',
  authMiddleware, roleMiddleware(['owner']), ownerApproved,
  validate(createTurfSchema),
  createTurf
);

router.put(
  '/:id',
  authMiddleware, roleMiddleware(['owner']), ownerApproved,
  validate(updateTurfSchema),
  updateTurf
);

router.delete(
  '/:id',
  authMiddleware, roleMiddleware(['owner']), ownerApproved,
  deleteTurf
);

router.patch(
  '/:id/toggle-active',
  authMiddleware, roleMiddleware(['owner']), ownerApproved,
  toggleTurfActive
);

// Image upload (multipart/form-data, field name: images)
router.post(
  '/:id/images',
  authMiddleware, roleMiddleware(['owner']), ownerApproved,
  upload.array('images', 8),
  uploadImages
);

router.delete(
  '/:id/images',
  authMiddleware, roleMiddleware(['owner']), ownerApproved,
  deleteImage
);

module.exports = router;
