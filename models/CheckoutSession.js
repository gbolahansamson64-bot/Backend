const mongoose = require("mongoose");

const checkoutItemSchema = new mongoose.Schema(
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
  },
  {
    _id: false
  }
);

const checkoutSessionSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    guestId: {
    type: String,
    default: null
    },

    isGuest: {
      type: Boolean,
      default: true
    },

    // --------------------------------------------------
    // CUSTOMER INFORMATION
    // --------------------------------------------------

    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

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
      required: true,
      trim: true
    },

    // --------------------------------------------------
    // SHIPPING ADDRESS
    // --------------------------------------------------

    shippingAddress: {
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
    // PRODUCTS
    // --------------------------------------------------

    items: {
      type: [checkoutItemSchema],
      required: true
    },

    // --------------------------------------------------
    // MONEY
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
      default: "card"
    },

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Paid",
        "Failed",
        "Expired"
      ],
      default: "Pending"
    },

    // --------------------------------------------------
    // STRIPE
    // --------------------------------------------------

    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true
    },

    stripeEventId: {
    type: String,
    default: null
},

    order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null
},

    // --------------------------------------------------
    // CHECKOUT STATUS
    // --------------------------------------------------

    status: {
      type: String,
      enum: [
        "Pending",
        "Completed",
        "Failed",
        "Expired"
      ],
      default: "Pending"
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.CheckoutSession ||
  mongoose.model(
    "CheckoutSession",
    checkoutSessionSchema
  );