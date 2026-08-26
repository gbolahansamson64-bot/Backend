const express = require("express");

const router = express.Router();

const {
    getPublicShippingRules
} =
    require("../controllers/shippingController");


// ==================================================
// PUBLIC STOREFRONT SHIPPING RATES
// No admin auth - read-only, available countries only.
// ==================================================

router.get(
    "/",
    getPublicShippingRules
);


module.exports = router;