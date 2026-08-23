const mongoose = require("mongoose");
const slugify = require("slugify");
const Product = require("../models/Product");
require("dotenv").config();

async function generateSlugs() {

    try {

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected");

        const products = await Product.find();

        for (const product of products) {

            product.slug = slugify(product.name, {
                lower: true,
                strict: true
            });

            await product.save();

            console.log("Updated:", product.name);

        }

        console.log("All slugs generated successfully.");

        process.exit();

    } catch (error) {

        console.error(error);

        process.exit(1);

    }

}

generateSlugs();