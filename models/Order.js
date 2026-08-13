const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    customerEmail: {
      type: String,
      required: true
    },

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

    shippingAddress: {
      firstName: {
        type: String,
        required: true
      },

      lastName: {
        type: String,
        required: true
      },

      phone: {
        type: String,
        default: ""
      },

      address: {
        type: String,
        required: true
      },

      city: {
        type: String,
        required: true
      },

      state: {
        type: String,
        required: true
      },

      country: {
        type: String,
        required: true
      },

      postalCode: {
        type: String,
        required: true
      }
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    shippingFee: {
      type: Number,
      default: 0
    },

    tax: {
      type: Number,
      default: 0
    },

    total: {
      type: Number,
      required: true,
      min: 0
    },

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

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);