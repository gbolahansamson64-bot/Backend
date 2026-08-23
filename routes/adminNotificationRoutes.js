const express = require("express");

const router = express.Router();

const protectAdmin = require("../middleware/adminMiddleware");

const {
  getAdminNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  dismissNotification,
  clearAllNotifications,
} = require("../controllers/adminNotificationController");

// Get all notifications
router.get(
  "/",
  protectAdmin,
  getAdminNotifications
);

// Get unread notification count
router.get(
  "/unread-count",
  protectAdmin,
  getUnreadNotificationCount
);

// Mark a notification as read
router.patch(
  "/:id/read",
  protectAdmin,
  markNotificationAsRead
);

// Dismiss one notification
router.delete(
  "/:id",
  protectAdmin,
  dismissNotification
);

// Clear all notifications
router.delete(
  "/",
  protectAdmin,
  clearAllNotifications
);

module.exports = router;