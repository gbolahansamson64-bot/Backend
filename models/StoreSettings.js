const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      trim: true,
      default: 'Blegab Luxury Wigs'
    },

    supportEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    storeAddress: {
      type: String,
      trim: true,
      default: 'Lagos, Nigeria'
    },

    sessionTimeoutMinutes: {
      type: Number,
    //   required: true,
      default: 10080,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);