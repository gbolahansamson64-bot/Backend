const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      required: true,
      minlength: 8,
    },

    accessCode: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "superadmin"],
      default: "admin",
    },

    isVerified: {
      type: Boolean,
      default: true,
    },

    passwordResetCode: {
      type: String,
    },

    passwordResetExpires: {
      type: Date,
    },

    accessCodeResetCode: {
      type: String,
    },

    accessCodeResetExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/*
========================================
Hash Password Before Saving
========================================
*/

adminSchema.pre("save", async function () {

  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);

});

/*
========================================
Hash Access Code Before Saving
========================================
*/

adminSchema.pre("save", async function () {

  if (!this.isModified("accessCode")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.accessCode = await bcrypt.hash(this.accessCode, salt);

});

/*
========================================
Compare Password
========================================
*/

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/*
========================================
Compare Access Code
========================================
*/

adminSchema.methods.matchAccessCode = async function (enteredCode) {
  return await bcrypt.compare(enteredCode, this.accessCode);
};

module.exports = mongoose.model("Admin", adminSchema);