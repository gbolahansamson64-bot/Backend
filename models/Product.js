const mongoose = require("mongoose");
const slugify = require("slugify");

const productSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true,
        trim: true
    },

    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },

    description: {
        type: String,
        required: true
    },

    price: {

    type: Number,

    required: true,

    min: 0

    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },

    brand: {
        type: String,
    },

    sku: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
},

status: {
    type: String,
    enum: [
        "in-stock",
        "low-stock",
        "out-of-stock"
    ],
    default: "in-stock"
},

    length: {
    type: String,
    enum: [
        "8",
        "10",
        "12",
        "14",
        "16",
        "18",
        "20",
        "22",
        "24",
        "26",
        "28",
        "30"
    ]
},

// density: {
//     type: String,
//     enum: [
//         "180%",
//         "200%",
//         "250%"
//     ]
// },

capSize: {
    type: String,
    enum: [
        "small",
        "medium",
        "large"
    ]
},

laceType: {
    type: String,
    enum: [
        "HD Lace",
        "Transparent Lace",
        "Swiss Lace"
    ]
},

    stock: {
        type: Number,
        default: 0,
        min: 0
    },

    isActive: {
        type: Boolean,
        default: true
    },

    images: [
        {
            type: String
        }
    ],

    badge: {
        type: String,
        enum: [
            "",
            "New",
            "Sale",
            "Best Seller",
            "Featured",
            "Hot",
            "Limited"
        ],
        default: ""
    },

    rating: {
        type: Number,
        default: 0
    },

    numReviews: {
        type: Number,
        default: 0
    }

},
{
    timestamps: true
});


// Automatically generate slug before saving
productSchema.pre("save", function () {

    if (this.isModified("name")) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
        });
    }

});

module.exports = mongoose.model("Product", productSchema);