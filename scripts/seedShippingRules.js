require("dotenv").config();

const mongoose = require("mongoose");

const ShippingRule = require("../models/ShippingRule");

const SHIPPING_RULES = [

    {
        country: "United States",
        countryCode: "US",
        fee: 20,
        available: true
    },

    {
        country: "Canada",
        countryCode: "CA",
        fee: 20,
        available: true
    },

    {
        country: "Nigeria",
        countryCode: "NG",
        fee: 50,
        available: true
    },

    {
        country: "United Kingdom",
        countryCode: "GB",
        fee: 50,
        available: true
    }

];


const seedShippingRules = async () => {

    try {

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB connected."
        );


        for (
            const shippingRule
            of SHIPPING_RULES
        ) {

            await ShippingRule.findOneAndUpdate(

                {
                    countryCode:
                        shippingRule.countryCode
                },

                shippingRule,

                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }

            );

            console.log(
                `Shipping rule saved: ${shippingRule.country}`
            );

        }


        console.log(
            "Shipping rules seeded successfully."
        );


        await mongoose.disconnect();

        process.exit(0);

    } catch (error) {

        console.error(
            "SHIPPING SEED ERROR:",
            error
        );

        await mongoose.disconnect();

        process.exit(1);

    }

};


seedShippingRules();