const express = require("express");

const router = express.Router();

const { protect, optionalAuth } = require("../middleware/authMiddleware");

const {
  createCheckoutSession,
  verifyPayment,
  getMyOrders,
  getSingleOrder,
  cancelOrder
} = require("../controllers/orderController");


// Customer Checkout — guests allowed, logged-in users still get req.user
router.post(
  "/checkout",
  optionalAuth,
  createCheckoutSession
);


// Verify Payment
router.get(
  "/verify-payment/:sessionId",
  verifyPayment
);


// Customer Order History — requires an account
router.get(
  "/my-orders",
  protect,
  getMyOrders
);


// Single Order — requires an account
router.get(
  "/:orderId",
  protect,
  getSingleOrder
);


// Cancel Order — requires an account
router.patch(
  "/:orderId/cancel",
  protect,
  cancelOrder
);


module.exports = router;