const ShippingRule =
    require("../models/ShippingRule");


// ==================================================
// GET ALL SHIPPING RULES
// ==================================================

const getShippingRules = async (req, res) => {

    try {

        const rules =
            await ShippingRule.find()
                .sort({
                    country: 1
                });

        return res.status(200).json({

            success: true,

            count:
                rules.length,

            rules

        });

    } catch (error) {

        console.error(
            "GET SHIPPING RULES ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to retrieve shipping rules."

        });

    }

};


// ==================================================
// CREATE SHIPPING RULE
// ==================================================

const createShippingRule = async (req, res) => {

    try {

        const {
            country,
            countryCode,
            fee,
            available
        } = req.body;


        if (
            !country ||
            !countryCode ||
            fee === undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Country, country code and shipping fee are required."

            });

        }


        const cleanCountry =
            country.trim();

        const cleanCountryCode =
            countryCode
                .trim()
                .toUpperCase();


        const numericFee =
            Number(fee);


        if (
            !Number.isFinite(
                numericFee
            ) ||
            numericFee < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Shipping fee must be a valid number greater than or equal to zero."

            });

        }


        const existingRule =
            await ShippingRule.findOne({

                $or: [
                    {
                        country:
                            cleanCountry
                    },
                    {
                        countryCode:
                            cleanCountryCode
                    }
                ]

            });


        if (existingRule) {

            return res.status(409).json({

                success: false,

                message:
                    "A shipping rule already exists for this country."

            });

        }


        const rule =
            await ShippingRule.create({

                country:
                    cleanCountry,

                countryCode:
                    cleanCountryCode,

                fee:
                    numericFee,

                available:
                    available !== undefined
                        ? Boolean(available)
                        : true

            });


        return res.status(201).json({

            success: true,

            message:
                "Shipping rule created successfully.",

            rule

        });

    } catch (error) {

        console.error(
            "CREATE SHIPPING RULE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to create shipping rule."

        });

    }

};


// ==================================================
// UPDATE SHIPPING RULE
// ==================================================

const updateShippingRule = async (req, res) => {

    try {

        const {
            country,
            countryCode,
            fee,
            available,
        } = req.body;


        const rule =
            await ShippingRule.findById(
                req.params.id
            );


        if (!rule) {

            return res.status(404).json({
                success: false,
                message:
                    "Shipping rule not found."
            });

        }


        // ==========================================
        // UPDATE COUNTRY
        // ==========================================

        if (country !== undefined) {

            const normalizedCountry =
                typeof country === "string"
                    ? country.trim()
                    : "";

            if (!normalizedCountry) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Country name is required."
                });

            }


            const existingRule =
                await ShippingRule.findOne({
                    country: normalizedCountry,
                    _id: {
                        $ne: req.params.id
                    }
                });


            if (existingRule) {

                return res.status(400).json({
                    success: false,
                    message:
                        "A shipping rule already exists for this country."
                });

            }


            rule.country =
                normalizedCountry;

        }


        // ==========================================
        // UPDATE COUNTRY CODE
        // ==========================================

        if (countryCode !== undefined) {

            if (
                typeof countryCode !== "string"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Country code is required."
                });

            }


            const normalizedCountryCode =
                countryCode
                    .trim()
                    .toUpperCase();


            if (
                !/^[A-Z]{2}$/.test(
                    normalizedCountryCode
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Country code must contain exactly 2 letters."
                });

            }


            rule.countryCode =
                normalizedCountryCode;

        }


        // ==========================================
        // UPDATE SHIPPING FEE
        // ==========================================

        if (fee !== undefined) {

            const numericFee =
                Number(fee);


            if (
                !Number.isFinite(
                    numericFee
                ) ||
                numericFee < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Shipping fee must be a valid number greater than or equal to zero."
                });

            }


            rule.fee =
                numericFee;

        }


        // ==========================================
        // UPDATE AVAILABILITY
        // ==========================================

        if (
            available !== undefined
        ) {

            rule.available =
                Boolean(available);

        }


        // ==========================================
        // SAVE
        // ==========================================

        await rule.save();


        return res.status(200).json({

            success: true,

            message:
                "Shipping rule updated successfully.",

            rule

        });


    } catch (error) {

        console.error(
            "UPDATE SHIPPING RULE ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to update shipping rule."

        });

    }

};


// ==================================================
// DELETE SHIPPING RULE
// ==================================================

const deleteShippingRule = async (req, res) => {

    try {

        const rule =
            await ShippingRule.findById(
                req.params.id
            );


        if (!rule) {

            return res.status(404).json({

                success: false,

                message:
                    "Shipping rule not found."

            });

        }


        await rule.deleteOne();


        return res.status(200).json({

            success: true,

            message:
                "Shipping rule deleted successfully."

        });

    } catch (error) {

        console.error(
            "DELETE SHIPPING RULE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to delete shipping rule."

        });

    }

};


// ==================================================
// GET PUBLIC SHIPPING RULES
// (No auth — used by the storefront checkout page.
//  Only returns rules the admin has marked available.)
// ==================================================

const getPublicShippingRules = async (req, res) => {

    try {

        const rules =
            await ShippingRule.find({
                available: true
            })
                .select("country countryCode fee -_id")
                .sort({
                    country: 1
                });

        return res.status(200).json({

            success: true,

            count:
                rules.length,

            rules

        });

    } catch (error) {

        console.error(
            "GET PUBLIC SHIPPING RULES ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to retrieve shipping rules."

        });

    }

};


module.exports = {

    getShippingRules,

    createShippingRule,

    updateShippingRule,

    deleteShippingRule,

    getPublicShippingRules

};