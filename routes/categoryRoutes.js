const express = require("express");

const router = express.Router();

const {

    createCategory,

    getCategories,

    getCategoryById,

    updateCategory,

    deleteCategory

} = require("../controllers/categoryController");

const  protectAdmin = require("../middleware/adminMiddleware");

// PUBLIC
router.get("/", getCategories);

router.get("/:id", getCategoryById);



// ADMIN
router.post(
    "/",
    protectAdmin,
    createCategory
);

router.put(
    "/:id",
    protectAdmin,
    updateCategory
);

router.delete(
    "/:id",
    protectAdmin,
    deleteCategory
);

module.exports = router;