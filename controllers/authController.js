const User = require("../models/User");
const bcrypt = require("bcryptjs");
const welcomeEmail = require("../templates/welcomeEmail");
const crypto = require("crypto");
const generateOTP = require("../utils/generateOTP");
const sendEmail = require("../utils/sendEmail");
const cookieOptions = require("../utils/cookieOptions");
const generateToken = require("../utils/generateToken");
const sendTokenResponse = require("../utils/sendTokenResponse");

// ==========================
// Register User
// ==========================

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, Last name, email and password are required",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
});

// Customer is automatically logged in after registration
user.isOnline = true;
user.lastSeen = new Date();

await user.save();

sendTokenResponse(
    user,
    201,
    "Registration successful",
    res
);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Login User
// ==========================

const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message: "Email and password are required"

            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(400).json({

                success: false,

                message: "Invalid email or password"

            });

        }

        if (user.provider === "google") {

          return res.status(400).json({

          success: false,

          message: "Please sign in with Google."

        });

      }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

    return res.status(400).json({

        success: false,

        message: "Invalid email or password"

    });

}

// Mark customer as online
user.isOnline = true;
user.lastSeen = new Date();

await user.save();

sendTokenResponse(
    user,
    200,
    "Login successful",
    res
);

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const logout = async (req, res) => {

    try {

        await User.findByIdAndUpdate(req.user._id, {
            isOnline: false,
            lastSeen: new Date()
        });

        res.clearCookie("token", cookieOptions);

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const getMe = async (req, res) => {

    try {

        res.status(200).json({

            success: true,

            user: req.user

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

// ==========================
// Update Customer Profile
// ==========================

const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneCode,
      phone,
      dob,
      gender,
      address,
      country,
      state,
      city,
      postalCode,
      newsletter,
      image,
    } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name and email are required",
      });
    }

    // Check whether another account already uses this email
    const normalizedEmail = email.toLowerCase().trim();

const existingUser = await User.findOne({
  email: normalizedEmail,
});

if (
  existingUser &&
  existingUser._id.toString() !== req.user._id.toString()
) {
  return res.status(400).json({
    success: false,
    message: "This email address is already in use",
  });
}

    // Update basic profile information
    req.user.firstName = firstName.trim();
    req.user.lastName = lastName.trim();
    req.user.email = email.toLowerCase().trim();

    req.user.phoneCode = phoneCode || "";
    req.user.phone = phone || "";

    req.user.dob = dob || null;
    req.user.gender = gender || "";

    req.user.address = {
      street: address || "",
      country: country || "",
      state: state || "",
      city: city || "",
      postalCode: postalCode || "",
    };

    req.user.newsletter = !!newsletter;

    // Temporary image handling
    // We will replace this with Cloudinary shortly.
    if (typeof image === "string") {
      req.user.avatar = image;
    }

    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",

      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phoneCode: req.user.phoneCode,
        phone: req.user.phone,
        dob: req.user.dob,
        gender: req.user.gender,

        address: {
          street: req.user.address?.street || "",
          country: req.user.address?.country || "",
          state: req.user.address?.state || "",
          city: req.user.address?.city || "",
          postalCode: req.user.address?.postalCode || "",
        },

        newsletter: req.user.newsletter,

        image: req.user.avatar || "",
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const heartbeat = async (req, res) => {
    try {

        req.user.isOnline = true;
        req.user.lastSeen = new Date();

        await req.user.save();

        res.status(200).json({
            success: true,
            message: "Heartbeat received"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const forgotPassword = async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {

            return res.status(400).json({
                message: "Email is required"
            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                message: "No account found with this email"
            });

        }

        const otp = generateOTP();

        user.resetPasswordOTP = otp;

        user.resetPasswordOTPExpires =
            Date.now() + 10 * 60 * 1000;

        await user.save();

        const emailResult = await sendEmail({
  to: user.email,
  subject: "Password Reset Code",
  html: `
    <h2>Blegab Luxury Wigs</h2>

    <p>Your password reset code is:</p>

    <h1>${otp}</h1>

    <p>This code expires in 10 minutes.</p>

    <p>If you didn't request this, ignore this email.</p>
  `,
});

console.log("Password reset email result:", emailResult);

        res.status(200).json({

            message: "Password reset code sent successfully"

        });

    } catch (error) {

        res.status(500).json({

            message: error.message

        });

    }

};

const verifyResetCode = async (req, res) => {

    try {

        const { email, otp } = req.body;

        if (!email || !otp) {

            return res.status(400).json({
                message: "Email and OTP are required"
            });

        }

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        if (user.resetPasswordOTP !== otp) {

            return res.status(400).json({
                message: "Invalid verification code"
            });

        }

        if (
          !user.resetPasswordOTPExpires ||
          user.resetPasswordOTPExpires.getTime() < Date.now()
        ) {

            return res.status(400).json({
                message: "Verification code has expired"
            });

        }

        // ADD THESE TWO LINES
        user.resetPasswordVerified = true;
        await user.save();

        res.status(200).json({

            message: "Verification successful"

        });

    } catch (error) {

        res.status(500).json({

            message: error.message

        });

    }

};



const resetPassword = async (req, res) => {

    try {

        const {

            email,

            password

        } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                message: "Email and password are required"

            });

        }

        const user = await User.findOne({

            email

        });

        if (!user) {

            return res.status(404).json({

                message: "User not found"

            });

        }

        if (!user.resetPasswordVerified) {

            return res.status(400).json({

                message: "Please verify your reset code first"

            });

        }

        if (
           !user.resetPasswordOTPExpires ||
           user.resetPasswordOTPExpires.getTime() < Date.now()
          ) {
           return res.status(400).json({
           message: "Verification has expired"
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;

        user.resetPasswordOTP = null;

        user.resetPasswordOTPExpires = null;

        user.resetPasswordVerified = false;

        await user.save();

        res.status(200).json({

            message: "Password reset successfully"

        });

    } catch (error) {

        res.status(500).json({

            message: error.message

        });

    }

};

const googleCallback = async (req, res) => {

    try {

        const token = generateToken(req.user._id);

         res.cookie("token", token, {
         
             ...cookieOptions,

             maxAge: 30 * 24 * 60 * 60 * 1000

         });

      res.redirect(process.env.CLIENT_URL + "/index.html");

    } catch (error) {

        res.status(500).json({

            message: error.message

        });

    }

};

const checkOfflineUsers = async () => {

    try {

        const timeout = new Date(Date.now() - 60 * 1000);

        await User.updateMany(
            {
                isOnline: true,
                lastSeen: { $lt: timeout }
            },
            {
                $set: {
                    isOnline: false
                }
            }
        );

    } catch (error) {

        console.error("Offline checker error:", error);

    }

};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  googleCallback,
  getMe,
  updateProfile,
  heartbeat,
  checkOfflineUsers,
};