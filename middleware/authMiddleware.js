const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cookieOptions = require("../utils/cookieOptions");

const protect = async (req, res, next) => {
  try {
   const token = req.cookies.token;

if (!token) {

    return res.status(401).json({

        success: false,

        message: "Not authorized"

    });

}

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token is invalid",
    });
  }
};

const optionalProtect = async (req, res, next) => {
  const token = req.cookies.token;

  // No token = guest checkout
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(
      decoded.id
    ).select("-password");

    if (!user) {
      // Token is well-formed but the account it points to
      // no longer exists (deleted account, stale/leftover
      // cookie from a wiped DB, etc). This middleware is
      // "optional" auth, so fall back to guest instead of
      // blocking the request — clear the bad cookie so the
      // browser stops sending it.
      res.clearCookie("token", cookieOptions);
      req.user = null;
      return next();
    }

    req.user = user;

    next();

  } catch (error) {
    // Expired/invalid/tampered token — same reasoning as above,
    // don't hard-fail an optional-auth route, just treat as guest.
    res.clearCookie("token", cookieOptions);
    req.user = null;
    return next();
  }
};

module.exports = {
  protect,
  optionalProtect
};