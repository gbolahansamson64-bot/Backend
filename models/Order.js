const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // REGISTERED CUSTOMER
    // --------------------------------------------------
    // Optional because the new architecture supports
    // guest checkout.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null
    },

    // --------------------------------------------------
    // GUEST / CUSTOMER INFORMATION
    // --------------------------------------------------

    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    // --------------------------------------------------
    // ORDER ITEMS
    // --------------------------------------------------

    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },

        name: {
          type: String,
          required: true
        },

        image: {
          type: String,
          default: ""
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        price: {
          type: Number,
          required: true,
          min: 0
        }
      }
    ],

    // --------------------------------------------------
    // SHIPPING ADDRESS
    // --------------------------------------------------

    shippingAddress: {
      firstName: {
        type: String,
        required: true,
        trim: true
      },

      lastName: {
        type: String,
        required: true,
        trim: true
      },

      phone: {
        type: String,
        default: "",
        trim: true
      },

      address: {
        type: String,
        required: true,
        trim: true
      },

      city: {
        type: String,
        required: true,
        trim: true
      },

      state: {
        type: String,
        required: true,
        trim: true
      },

      country: {
        type: String,
        required: true,
        trim: true
      },

      postalCode: {
        type: String,
        required: true,
        trim: true
      }
    },

    // --------------------------------------------------
    // ORDER TOTALS
    // --------------------------------------------------

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0
    },

    shippingRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShippingRule",
    default: null
},

    tax: {
      type: Number,
      default: 0,
      min: 0
    },

    total: {
      type: Number,
      required: true,
      min: 0
    },

    // --------------------------------------------------
    // PAYMENT
    // --------------------------------------------------

    paymentMethod: {
      type: String,
      enum: [
        "card",
        "googlepay",
        "applepay",
        "afterpay",
        "stripe"
      ],
      default: "card"
    },

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Paid",
        "Failed",
        "Refunded"
      ],
      default: "Pending"
    },

    // --------------------------------------------------
    // ORDER STATUS
    // --------------------------------------------------

    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
      ],
      default: "Pending"
    },

    // --------------------------------------------------
    // STRIPE INFORMATION
    // --------------------------------------------------

    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true
    },

    stripeCustomerId: {
      type: String,
      default: null
    },

    stripePaymentIntentId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Order || mongoose.model("Order", orderSchema);