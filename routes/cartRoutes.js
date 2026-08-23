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

const { optionalProtect } = require("../middleware/authMiddleware");

// Guest + logged-in customer
router.post("/add", optionalProtect, addToCart);

router.get("/", optionalProtect, getCart);

router.put(
    "/update/:productId",
    optionalProtect,
    updateCartItem
);

router.delete(
    "/remove/:productId",
    optionalProtect,
    removeCartItem
);

router.delete(
    "/clear",
    optionalProtect,
    clearCart
);

router.get(
    "/count",
    optionalProtect,
    getCartCount
);

module.exports = router;