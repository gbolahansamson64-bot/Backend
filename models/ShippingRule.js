const mongoose = require("mongoose");

const shippingRuleSchema = new mongoose.Schema(
    {
        country: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        countryCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            minlength: 2,
            maxlength: 2
        },

        fee: {
            type: Number,
            required: true,
            min: 0
        },

        available: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model(
        "ShippingRule",
        shippingRuleSchema
    );