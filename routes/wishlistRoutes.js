const express = require("express");

const router = express.Router();

const {
    toggleWishlist,
    getWishlist,
    clearWishlist,
    getWishlistCount,
    isWishlisted
} = require("../controllers/wishlistController");

const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getWishlist);

router.get("/count", getWishlistCount);

router.get("/check/:productId", isWishlisted);

router.post("/toggle", toggleWishlist);

router.delete("/clear", clearWishlist);

module.exports = router;