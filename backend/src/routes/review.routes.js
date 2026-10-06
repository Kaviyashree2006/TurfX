const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const validate       = require('../middlewares/validate.middleware');
const { createReviewSchema, updateReviewSchema } = require('../validators/review.validators');
const {
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
} = require('../controllers/review.controller');

// GET  /api/reviews/my   — must come before /:id
router.get('/my', authMiddleware, roleMiddleware(['customer']), getMyReviews);

// POST /api/reviews
router.post('/',
  authMiddleware, roleMiddleware(['customer']),
  validate(createReviewSchema),
  createReview
);

// PUT  /api/reviews/:id
router.put('/:id',
  authMiddleware, roleMiddleware(['customer']),
  validate(updateReviewSchema),
  updateReview
);

// DELETE /api/reviews/:id  — customer deletes own
router.delete('/:id',
  authMiddleware, roleMiddleware(['customer']),
  deleteReview
);

module.exports = router;
