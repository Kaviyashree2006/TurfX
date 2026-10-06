const express = require('express');
const router  = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  deleteNotification,
} = require('../controllers/notification.controller');

// All notification routes require authentication (any role)
router.use(authMiddleware);

// read-all and unread-count MUST be registered before /:id routes
router.get('/unread-count',    getUnreadCount);
router.patch('/read-all',      markAllRead);
router.get('/',                getNotifications);
router.patch('/:id/read',      markRead);
router.delete('/:id',          deleteNotification);

module.exports = router;
