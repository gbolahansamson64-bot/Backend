const Admin = require("../models/Admin");
const generateAdminToken = require("../utils/generateAdminToken");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");

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

// ==========================================
// Update Admin Email
// ==========================================

const updateAdminEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Check whether another admin already uses this email
    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
      _id: { $ne: req.admin._id },
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "This email address is already in use.",
      });
    }

    // Find the currently logged-in admin
    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found.",
      });
    }

    // Update email
    admin.email = normalizedEmail;

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Admin email updated successfully.",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {
    console.error("UPDATE ADMIN EMAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update admin email.",
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
            .populate(
                "user",
                "firstName lastName email phone"
            )
            .populate({
                path: "orderItems.product",
                select: `
                    name
                    description
                    sku
                    price
                    category
                    length
                    capSize
                    laceType
                    images
                `,
                populate: {
                    path: "category",
                    select: "name"
                }
            })
            .sort({
                createdAt: -1
            });


        const formattedOrders = orders.map(order => {

            const customerName =
                order.shippingAddress
                    ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
                    : order.user
                        ? `${order.user.firstName} ${order.user.lastName}`
                        : "Guest Customer";


            const customerEmail =
                order.customerEmail ||
                (order.user
                    ? order.user.email
                    : "");


            return {
                ...order.toObject(),

                customer: {
                    name: customerName,
                    email: customerEmail,
                    phone:
                        order.shippingAddress?.phone ||
                        order.user?.phone ||
                        ""
                },

                customerType:
                    order.user
                        ? "registered"
                        : "guest"
            };

        });


        return res.status(200).json({

            success: true,

            orders: formattedOrders

        });


    } catch (error) {

        console.error(
            "GET ALL ORDERS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to retrieve orders."

        });

    }

};

const getSingleAdminOrder = async (req, res) => {

    try {

        const order = await Order.findById(
            req.params.id
        )
        .populate(
            "user",
            "firstName lastName email phone"
        )
        .populate({
            path: "orderItems.product",
            select: `
                name
                description
                sku
                price
                category
                length
                capSize
                laceType
                images
            `,
            populate: {
                path: "category",
                select: "name"
            }
        });


        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found"

            });

        }


        return res.status(200).json({

            success: true,

            order

        });


    } catch (error) {

        console.error(
            "GET SINGLE ADMIN ORDER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

};

const deleteOrder = async (req, res) => {

    try {

        const order = await Order.findById(
            req.params.id
        );

        if (!order) {

            return res.status(404).json({
                success: false,
                message: "Order not found"
            });

        }


        // ==========================================
        // PREVENT DELETING PAID ORDERS
        // ==========================================

        if (order.paymentStatus === "Paid") {

            return res.status(400).json({

                success: false,

                message:
                    "Paid orders cannot be deleted. Cancel or refund the order instead."

            });

        }


        await order.deleteOne();


        return res.status(200).json({

            success: true,

            message:
                "Order deleted successfully"

        });


    } catch (error) {

        console.error(
            "DELETE ORDER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const deleteSelectedOrders = async (req, res) => {

    try {

        const { orderIds } = req.body;


        // ==========================================
        // 1. VALIDATE INPUT
        // ==========================================

        if (
            !Array.isArray(orderIds) ||
            orderIds.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "No orders selected"

            });

        }


        // ==========================================
        // 2. FIND SELECTED ORDERS
        // ==========================================

        const orders = await Order.find({

            _id: {
                $in: orderIds
            }

        });


        // ==========================================
        // 3. BLOCK PAID ORDERS
        // ==========================================

        const paidOrders =
            orders.filter(
                order =>
                    order.paymentStatus === "Paid"
            );


        if (paidOrders.length > 0) {

            return res.status(400).json({

                success: false,

                message:
                    "One or more selected orders are paid and cannot be deleted."

            });

        }


        // ==========================================
        // 4. DELETE UNPAID ORDERS
        // ==========================================

        await Order.deleteMany({

            _id: {
                $in: orders.map(order => order._id)
            }

        });


        return res.status(200).json({

            success: true,

            message:
                "Selected orders deleted successfully"

        });


    } catch (error) {

        console.error(
            "DELETE SELECTED ORDERS ERROR:",
            error
        );

        return res.status(500).json({

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


        // ==========================================
        // 1. VALIDATE STATUS
        // ==========================================

        if (!allowedStatuses.includes(orderStatus)) {

            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });

        }


        // ==========================================
        // 2. FIND ORDER
        // ==========================================

        const order = await Order.findById(
            req.params.id
        );

        if (!order) {

            return res.status(404).json({
                success: false,
                message: "Order not found"
            });

        }


        // ==========================================
        // 3. NO CHANGE NEEDED
        // ==========================================

        if (order.orderStatus === orderStatus) {

            return res.status(200).json({
                success: true,
                message: "Order status unchanged",
                order
            });

        }


        // ==========================================
        // 4. PREVENT CHANGES AFTER DELIVERY
        // ==========================================

        if (order.orderStatus === "Delivered") {

            return res.status(400).json({
                success: false,
                message:
                    "A delivered order cannot be changed."
            });

        }


        // ==========================================
        // 5. PREVENT CHANGES AFTER CANCELLATION
        // ==========================================

        if (order.orderStatus === "Cancelled") {

            return res.status(400).json({
                success: false,
                message:
                    "A cancelled order cannot be changed."
            });

        }


        // ==========================================
        // 6. ENFORCE ORDER STATUS FLOW
        // ==========================================

        const validTransitions = {

            Pending: [
                "Processing",
                "Cancelled"
            ],

            Processing: [
                "Shipped",
                "Cancelled"
            ],

            Shipped: [
                "Delivered"
            ],

            Delivered: [],

            Cancelled: []

        };


        const allowedNextStatuses =
            validTransitions[
                order.orderStatus
            ] || [];


        if (
            !allowedNextStatuses.includes(
                orderStatus
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `Cannot change order status from ${order.orderStatus} to ${orderStatus}.`
            });

        }


        // ==========================================
        // 7. HANDLE CANCELLATION
        // ==========================================

        if (orderStatus === "Cancelled") {

            // Restore stock only for paid orders.
            if (order.paymentStatus === "Paid") {

                for (
                    const item
                    of order.orderItems
                ) {

                    const product =
                        await Product.findById(
                            item.product
                        );

                    if (product) {

                        product.stock +=
                            item.quantity;

                        // Keep product status
                        // synchronized with stock.
                        if (product.stock <= 0) {

                            product.status =
                                "out-of-stock";

                        } else if (
                            product.stock <= 5
                        ) {

                            product.status =
                                "low-stock";

                        } else {

                            product.status =
                                "in-stock";

                        }

                        await product.save();

                    }

                }

            }

        }


        // ==========================================
        // 8. SAVE NEW ORDER STATUS
        // ==========================================

        order.orderStatus =
            orderStatus;

        await order.save();


        // ==========================================
        // 9. CUSTOMER STATUS EMAIL
        // ==========================================

        try {

            if (order.customerEmail) {

                await sendEmail({

                    to:
                        order.customerEmail,

                    subject:
                        `Order ${order._id} Status Updated`,

                    html: `
                        <h2>
                            Order Status Updated
                        </h2>

                        <p>
                            Your order
                            <strong>
                                ${order._id}
                            </strong>
                            is now:
                            <strong>
                                ${order.orderStatus}
                            </strong>
                        </p>

                        <p>
                            Thank you for shopping with us.
                        </p>
                    `

                });

            }

        } catch (emailError) {

            console.error(
                "ORDER STATUS EMAIL ERROR:",
                emailError
            );

        }


        // ==========================================
        // 10. RETURN UPDATED ORDER
        // ==========================================

        return res.status(200).json({

            success: true,

            message:
                "Order status updated successfully.",

            order

        });


    } catch (error) {

        console.error(
            "UPDATE ORDER STATUS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

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
  updateAdminEmail,
  getAllCustomers,
  deleteCustomer,
  getAllOrders,
  getSingleAdminOrder,
  deleteOrder,
  deleteSelectedOrders,
  updateOrderStatus
};