const express = require("express");

const router = express.Router();

const {
  register,
  login,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  googleCallback,
  getMe,
  heartbeat,
  updateProfile,
} = require("../controllers/authController");
const passport = require("passport");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);

router.post("/login", login);

router.post("/logout", protect, logout);

router.get("/me", protect, getMe);

router.put("/profile", protect, updateProfile);

router.post("/heartbeat", protect, heartbeat);

router.post("/forgot-password", forgotPassword);

router.post("/verify-reset-code", verifyResetCode);

router.post("/reset-password", resetPassword);

router.get(

    "/google",

    passport.authenticate(

        "google",

        {

            scope: ["profile", "email"]

        }

    )

);

router.get(

    "/google/callback",

    passport.authenticate(

        "google",

        {

            session: false,

            failureRedirect: process.env.CLIENT_URL + "/login.html"

        }

    ),

    googleCallback

);

module.exports = router;