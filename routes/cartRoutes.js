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

// const { protect } = require("../middleware/authMiddleware");

const { optionalAuth } = require("../middleware/authMiddleware");

router.post("/add", optionalAuth, addToCart);

router.get("/", optionalAuth, getCart);

router.put("/update/:productId", optionalAuth, updateCartItem);

router.delete("/remove/:productId", optionalAuth, removeCartItem);

router.delete("/clear", optionalAuth, clearCart);

router.get("/count", optionalAuth, getCartCount);

module.exports = router;