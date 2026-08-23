const ShippingRule =
    require("../models/ShippingRule");


// ==================================================
// NORMALIZE COUNTRY
// ==================================================

const normalizeCountry = (country) => {

    if (!country) {
        return "";
    }

    return country
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );

};


// ==================================================
// CALCULATE SHIPPING
// ==================================================

const calculateShipping = async (country, subtotal) => {

    const normalizedCountry =
        normalizeCountry(country);


    if (!normalizedCountry) {

        return {

            available: false,

            country: "",

            shippingFee: null,

            message:
                "Shipping country is required."

        };

    }

    // ==================================================
// FREE SHIPPING PROMOTION
// USA + CANADA ORDERS ABOVE $500
// ==================================================

const freeShippingCountries = [
    "United States",
    "Canada"
];

const orderSubtotal = Number(subtotal) || 0;

if (
    freeShippingCountries.includes(normalizedCountry) &&
    orderSubtotal > 500
) {
    return {
        available: true,
        country: normalizedCountry,
        countryCode:
            normalizedCountry === "United States"
                ? "US"
                : "CA",
        shippingFee: 0,
        shippingRuleId: null,
        message:
            "Free shipping applied."
    };
}


    // ==================================================
    // FIND SHIPPING RULE
    // ==================================================

    const rule =
        await ShippingRule.findOne({

            country: normalizedCountry

        });


    // ==================================================
    // COUNTRY NOT CONFIGURED
    // ==================================================

    if (!rule) {

        return {

            available: false,

            country:
                normalizedCountry,

            shippingFee: null,

            message:
                "Shipping to this country is currently unavailable."

        };

    }


    // ==================================================
    // COUNTRY DISABLED BY ADMIN
    // ==================================================

    if (!rule.available) {

        return {

            available: false,

            country:
                rule.country,

            countryCode:
                rule.countryCode,

            shippingFee: null,

            message:
                `Shipping to ${rule.country} is currently unavailable.`

        };

    }


    // ==================================================
    // COUNTRY AVAILABLE
    // ==================================================

    return {

    available: true,

    shippingRuleId:
        rule._id,

    country:
        rule.country,

    countryCode:
        rule.countryCode,

    shippingFee:
        rule.fee,

    message:
        `Shipping fee is $${rule.fee}.`

};

};


module.exports = {

    normalizeCountry,

    calculateShipping

};