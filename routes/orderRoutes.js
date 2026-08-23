const express = require("express");

const router = express.Router();

const { protect, optionalProtect } = require("../middleware/authMiddleware");

const {
  createCheckoutSession,
  verifyPayment,
  getMyOrders,
  getSingleOrder,
  trackOrder,
  cancelOrder
} = require("../controllers/orderController");


// Customer Checkout
router.post(
  "/checkout",
  optionalProtect,
  createCheckoutSession
);


// Verify Payment
router.get(
  "/verify-payment/:sessionId",
  verifyPayment
);


// Customer Order History
router.get(
  "/my-orders",
  protect,
  getMyOrders
);

router.post(
  "/track",
  trackOrder
);


// Single Order
router.get(
  "/:orderId",
  protect,
  getSingleOrder
);


// Cancel Order
router.patch(
  "/:orderId/cancel",
  protect,
  cancelOrder
);


module.exports = router;