const express = require("express");

const router = express.Router();

const {

    addToCart,

    getCart,

    updateCartItem,

    removeCartItem,

    clearCart,

    getCartCount

} = require("../controllers/cartController");

const { protect } = require("../middleware/authMiddleware");

router.post("/add", protect, addToCart);

router.get("/", protect, getCart);

router.put("/update/:productId", protect, updateCartItem);

router.delete("/remove/:productId", protect, removeCartItem);

router.delete("/clear", protect, clearCart);

router.get("/count", protect, getCartCount);

module.exports = router;