const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    quantity: {
        type: Number,
        default: 1,
        min: 1
    }
});

const cartSchema = new mongoose.Schema(
    {
        // Logged-in customer's cart
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            unique: true,
            sparse: true
        },

        // Guest customer's cart
        guestId: {
            type: String,
            unique: true,
            sparse: true
        },

        items: [cartItemSchema]
    },
    {
        timestamps: true
    }
);

// A cart must belong to either a user OR a guest.
cartSchema.pre("validate", function () {
    if (!this.user && !this.guestId) {
        throw new Error(
            "Cart must belong to a user or guest"
        );
    }

    if (this.user && this.guestId) {
        throw new Error(
            "Cart cannot belong to both user and guest"
        );
    }
});

module.exports = mongoose.model("Cart", cartSchema);