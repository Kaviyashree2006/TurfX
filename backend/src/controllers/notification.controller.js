/**
 * notification.controller.js — Phase 6
 *
 * Route map (all require auth):
 *   GET    /api/notifications        → getNotifications   (own, paginated)
 *   GET    /api/notifications/unread-count → getUnreadCount
 *   PATCH  /api/notifications/:id/read    → markRead
 *   PATCH  /api/notifications/read-all    → markAllRead
 *   DELETE /api/notifications/:id         → deleteNotification
 */

const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const serialize = (doc) => ({
  id:        doc._id.toString(),
  type:      doc.type,
  title:     doc.title,
  message:   doc.message,
  refId:     doc.refId ?? null,
  refType:   doc.refType ?? null,
  read:      doc.read,
  createdAt: doc.createdAt,
});

// GET /api/notifications?page=1&limit=20
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Notification.countDocuments({ userId: req.user.userId }),
    Notification.countDocuments({ userId: req.user.userId, read: false }),
  ]);

  return successResponse(res, {
    notifications: notifications.map(serialize),
    total,
    unreadCount,
    page:  parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

// GET /api/notifications/unread-count
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.userId, read: false });
  return successResponse(res, { count });
});

// PATCH /api/notifications/read-all  — must be registered BEFORE /:id
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });
  return successResponse(res, {}, 'All notifications marked as read.');
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!n) return errorResponse(res, 'Notification not found.', 404, 'NOT_FOUND');
  n.read = true;
  await n.save();
  return successResponse(res, { notification: serialize(n) });
});

// DELETE /api/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!n) return errorResponse(res, 'Notification not found.', 404, 'NOT_FOUND');
  await n.deleteOne();
  return successResponse(res, {}, 'Notification deleted.');
});

module.exports = { getNotifications, getUnreadCount, markAllRead, markRead, deleteNotification };
