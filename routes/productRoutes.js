const express = require("express");

const router = express.Router();

const {
    createProduct,
    getProducts,
    getProductById,
    getProductBySlug,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const  protectAdmin   = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");

// Public Routes
router.get("/", getProducts);

// Must come BEFORE "/:id"
router.get("/slug/:slug", getProductBySlug);

router.get("/:id", getProductById);

// Admin Routes
router.post(
    "/",
    protectAdmin,
    upload.array("images", 10),
    createProduct
);

router.put(
    "/:id",
    protectAdmin,
    upload.array("images", 10),
    updateProduct
);

router.delete("/:id", protectAdmin, deleteProduct);

module.exports = router;