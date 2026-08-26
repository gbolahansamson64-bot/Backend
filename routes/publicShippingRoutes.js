const express = require("express");

const router = express.Router();

const {
    getPublicShippingRules
} =
    require("../controllers/shippingController");


// ==================================================
// PUBLIC SHIPPING RATES (no auth — storefront checkout)
// ==================================================

router.get(
    "/",
    getPublicShippingRules
);


module.exports = router;