const Notification = require("../models/Notification");

/**
 * GET /api/admin/notifications
 *
 * Get all active notifications for the admin dashboard.
 */
const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedNotifications = notifications.map((notification) => ({
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      referenceId: notification.referenceId
        ? notification.referenceId.toString()
        : null,
      referenceType: notification.referenceType,
      time: formatNotificationTime(notification.createdAt),
      createdAt: notification.createdAt,
    }));

    res.status(200).json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error("GET ADMIN NOTIFICATIONS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load notifications.",
    });
  }
};

/**
 * GET /api/admin/notifications/unread-count
 */
const getUnreadNotificationCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      isActive: true,
      read: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("GET UNREAD NOTIFICATION COUNT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get unread notification count.",
    });
  }
};

/**
 * PATCH /api/admin/notifications/:id/read
 *
 * Mark one notification as read.
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
      },
      {
        $set: {
          read: true,
        },
      },
      {
        new: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error("MARK NOTIFICATION READ ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
};

/**
 * DELETE /api/admin/notifications/:id
 *
 * Dismiss one notification.
 */
const dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      },
      {
        new: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification dismissed.",
    });
  } catch (error) {
    console.error("DISMISS NOTIFICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to dismiss notification.",
    });
  }
};

/**
 * DELETE /api/admin/notifications
 *
 * Clear all active notifications.
 */
const clearAllNotifications = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "All notifications cleared.",
    });
  } catch (error) {
    console.error("CLEAR ALL NOTIFICATIONS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to clear notifications.",
    });
  }
};

/**
 * Convert notification creation time into a
 * human-friendly string for the frontend.
 */
function formatNotificationTime(date) {
  const now = new Date();
  const notificationDate = new Date(date);

  const difference = now - notificationDate;

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  }

  if (minutes === 1) {
    return "1 minute ago";
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  if (hours === 1) {
    return "1 hour ago";
  }

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return notificationDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

module.exports = {
  getAdminNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  dismissNotification,
  clearAllNotifications,
};