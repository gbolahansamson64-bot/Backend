const express = require("express");

const router = express.Router();

const {
    getShippingRules,
    createShippingRule,
    updateShippingRule,
    deleteShippingRule
} =
    require("../controllers/shippingController");

const  protectAdmin  = require("../middleware/adminMiddleware");


// ==================================================
// ADMIN SHIPPING SETTINGS
// ==================================================

router.get(
    "/",
    protectAdmin,
    getShippingRules
);


router.post(
    "/",
    protectAdmin,
    createShippingRule
);


router.put(
    "/:id",
    protectAdmin,
    updateShippingRule
);


router.delete(
    "/:id",
    protectAdmin,
    deleteShippingRule
);


module.exports = router;