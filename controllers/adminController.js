const Admin = require("../models/Admin");
const generateAdminToken = require("../utils/generateAdminToken");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const Order = require("../models/Order");

// ==========================================
// Admin Signup
// ==========================================

const registerAdmin = async (req, res) => {
  try {
    const {
  name,
  email,
  password,
  accessCode,
  masterSecret,
} = req.body;

    if (
  !name ||
  !email ||
  !password ||
  !accessCode ||
  !masterSecret
) {
  return res.status(400).json({
    success: false,
    message: "Please fill all fields.",
  });
}

if (masterSecret !== process.env.MASTER_ADMIN_SECRET) {
  return res.status(403).json({
    success: false,
    message: "Invalid master admin secret.",
  });
}

    // Check if admin already exists
    const adminExists = await Admin.findOne({ email });

    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists.",
      });
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
      accessCode,
    });

    // Generate Cookie
    generateAdminToken(res, admin._id);

    res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ==========================================
// Admin Login
// ==========================================

const loginAdmin = async (req, res) => {
  try {
    const { email, password, accessCode } = req.body;

    // Validate fields
    if (!email || !password || !accessCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide email, password and access code.",
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare password
    const isPasswordCorrect = await admin.matchPassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare access code
    const isAccessCodeCorrect = await admin.matchAccessCode(accessCode);

    if (!isAccessCodeCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin access code.",
      });
    }

    // Generate JWT Cookie
    generateAdminToken(res, admin._id);

    // Return response
    res.status(200).json({
      success: true,
      message: "Admin login successful.",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Admin Logout
// ==========================================

const logoutAdmin = async (req, res) => {
  try {
    res.cookie("adminToken", "", {
      httpOnly: true,
      expires: new Date(0),
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      success: true,
      message: "Admin logged out successfully.",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ==========================================
// Get Current Logged-in Admin
// ==========================================

const getAdminProfile = async (req, res) => {
  try {

    res.status(200).json({
      success: true,
      admin: req.admin,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ==========================================
// Forgot Admin Password / Access Code
// ==========================================

const forgotAdminCredential = async (req, res) => {
  try {

    const { email, type } = req.body;

    if (!email || !type) {
      return res.status(400).json({
        success: false,
        message: "Email and recovery type are required.",
      });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "No admin account found with this email.",
      });
    }

    // Generate a random 6-digit code
    const resetCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (type === "password") {
      admin.passwordResetCode = resetCode;
      admin.passwordResetExpires = expires;
    } else if (type === "code") {
      admin.accessCodeResetCode = resetCode;
      admin.accessCodeResetExpires = expires;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid recovery type.",
      });
    }

    await admin.save();

    // Send Email
    await sendEmail({
  to: admin.email,
  subject: "Admin Recovery Code",
  html: `
    <h2>Admin Recovery Code</h2>

    <p>Your admin recovery code is:</p>

    <h1>${resetCode}</h1>

    <p>This code expires in 10 minutes.</p>

    <p>If you did not request this code, you can safely ignore this email.</p>
  `,
});

    res.status(200).json({
      success: true,
      message: "Recovery code sent successfully.",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ==========================================
// Verify Recovery Code
// ==========================================

const verifyAdminRecoveryCode = async (req, res) => {
  try {

    const { email, type, code } = req.body;

    if (!email || !type || !code) {
      return res.status(400).json({
        success: false,
        message: "Email, recovery type and code are required.",
      });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found.",
      });
    }

    if (type === "password") {

      if (
        admin.passwordResetCode !== code ||
        admin.passwordResetExpires < Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired recovery code.",
        });
      }

    } else if (type === "code") {

      if (
        admin.accessCodeResetCode !== code ||
        admin.accessCodeResetExpires < Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired recovery code.",
        });
      }

    } else {

      return res.status(400).json({
        success: false,
        message: "Invalid recovery type.",
      });

    }

    res.status(200).json({
      success: true,
      message: "Recovery code verified successfully.",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ===============================================
// Reset Admin Password or Access Code
// ===============================================

const resetAdminCredential = async (req, res) => {
  try {
    const {
      email,
      type,
      code,
      newPassword,
      newAccessCode,
    } = req.body;

    if (!email || !type || !code) {
      return res.status(400).json({
        success: false,
        message: "Email, type and code are required.",
      });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    if (type === "password") {

      if (
        admin.passwordResetCode !== code ||
        admin.passwordResetExpires < Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset code.",
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password is required.",
        });
      }

      admin.password = newPassword;

      admin.passwordResetCode = undefined;
      admin.passwordResetExpires = undefined;

    }

    else if (type === "code") {

      if (
        admin.accessCodeResetCode !== code ||
        admin.accessCodeResetExpires < Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset code.",
        });
      }

      if (!newAccessCode) {
        return res.status(400).json({
          success: false,
          message: "New access code is required.",
        });
      }

      admin.accessCode = newAccessCode;

      admin.accessCodeResetCode = undefined;
      admin.accessCodeResetExpires = undefined;

    }

    else {

      return res.status(400).json({
        success: false,
        message: "Invalid reset type.",
      });

    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: `${type} updated successfully.`,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({
      role: "user",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    const formattedCustomers = customers.map((customer) => ({
      id: customer._id.toString(),

      name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),

      image: customer.avatar || "",

      // IMPORTANT:
      // Read the real online status from MongoDB
      status: customer.isOnline ? "online" : "offline",

      email: customer.email || "",

      phone: customer.phone || "",

      country: customer.address?.country || "",

      state: customer.address?.state || "",

      // Useful later for admin dashboard
      isOnline: customer.isOnline || false,

      lastSeen: customer.lastSeen || null,

      createdAt: customer.createdAt || null
    }));

    res.status(200).json({
      success: true,
      customers: formattedCustomers,
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteCustomer = async (req, res) => {

    try {

        const customer = await User.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        await customer.deleteOne();

        res.status(200).json({
            success: true,
            message: "Customer deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const getAllOrders = async (req, res) => {

    try {

        const orders = await Order.find()
            .populate("user", "firstName lastName email")
            .populate({
    path: "orderItems.product",
    select: `
        name
        description
        sku
        category
        length
        density
        laceType
        images
    `,
    populate: {
        path: "category",
        select: "name"
    }
})
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            orders
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const deleteOrder = async (req, res) => {

    try {

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: "Order deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const deleteSelectedOrders = async (req, res) => {

    try {

        const { orderIds } = req.body;

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No orders selected"
            });
        }

        await Order.deleteMany({
            _id: {
                $in: orderIds
            }
        });

        res.status(200).json({
            success: true,
            message: "Orders deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const updateOrderStatus = async (req, res) => {

    try {

        const { orderStatus } = req.body;

        const allowedStatuses = [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(orderStatus)) {

            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });

        }

        const order = await Order.findById(req.params.id);

        if (!order) {

            return res.status(404).json({
                success: false,
                message: "Order not found"
            });

        }

        if (order.orderStatus === orderStatus) {

            return res.status(200).json({
                success: true,
                message: "Order status unchanged",
                order
            });

        }

        order.orderStatus = orderStatus;

        await order.save();

        await order.populate([
            {
                path: "user",
                select: "firstName lastName email"
            },
            {
                path: "orderItems.product"
            }
        ]);

        res.status(200).json({

            success: true,

            message: "Order status updated successfully",

            order

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  forgotAdminCredential,
  verifyAdminRecoveryCode,
  resetAdminCredential,
  getAllCustomers,
  deleteCustomer,
  getAllOrders,
  deleteOrder,
  deleteSelectedOrders,
  updateOrderStatus
};