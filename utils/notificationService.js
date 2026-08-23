const Notification = require("../models/Notification");

/**
 * Create an admin notification
 *
 * This function will be used by other parts of the backend
 * such as orders, payments, products, etc.
 */
async function createAdminNotification({
  title,
  message,
  type = "system",
  referenceId = null,
  referenceType = null,
  metadata = {},
}) {
  try {
    const notification = await Notification.create({
      title,
      message,
      type,
      referenceId,
      referenceType,
      metadata,
    });

    return notification;
  } catch (error) {
    console.error(
      "CREATE ADMIN NOTIFICATION ERROR:",
      error
    );

    throw error;
  }
}

module.exports = {
  createAdminNotification,
};