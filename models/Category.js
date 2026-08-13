const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    slug: {
        type: String,
        unique: true,
        lowercase: true
    },

    description: {
        type: String,
        default: ""
    }

}, {
    timestamps: true
});

categorySchema.pre("save", function () {

    if (this.isModified("name")) {

        this.slug = slugify(this.name, {
            lower: true,
            strict: true
        });

    }

});

module.exports = mongoose.model("Category", categorySchema);