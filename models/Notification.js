const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "order",
        "payment",
        "product",
        "stock",
        "customer",
        "security",
        "system",
        "general",
      ],
      default: "general",
    },

    read: {
      type: Boolean,
      default: false,
    },

    // Optional reference to the thing that caused
    // the notification.
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceType: {
      type: String,
      enum: [
        "Order",
        "Product",
        "User",
        "Payment",
        null,
      ],
      default: null,
    },

    // Allows us to know which admin should receive it.
    // null means all admins.
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    // Used when we want to temporarily hide/archive
    // a notification without physically deleting it.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);