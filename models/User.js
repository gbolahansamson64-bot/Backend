const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
    },

    // Profile picture URL
    avatar: {
      type: String,
      default: "",
    },

    // Phone
    phoneCode: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    // Date of birth
    dob: {
      type: Date,
      default: null,
    },

    // Gender
    gender: {
      type: String,
      enum: ["", "female", "male", "other"],
      default: "",
    },

    // Profile address
    address: {
      country: {
        type: String,
        default: "",
      },

      state: {
        type: String,
        default: "",
      },

      city: {
        type: String,
        default: "",
      },

      postalCode: {
        type: String,
        default: "",
      },

      street: {
        type: String,
        default: "",
      },
    },

    // Newsletter preference
    newsletter: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    resetPasswordOTP: {
      type: String,
      default: null,
    },

    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },

    resetPasswordVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);