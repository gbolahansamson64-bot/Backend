const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");


const toggleWishlist = async (req, res) => {

    try {

        const { productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
        success: false,
        message: "Invalid product ID."
    });
}

        const product = await Product.findOne({

            _id: productId,

            isActive: true

        });

        if (!product) {

            return res.status(404).json({

                success: false,

                message: "Product not found"

            });

        }

        let wishlist = await Wishlist.findOne({

            user: req.user._id

        });

        if (!wishlist) {

            wishlist = await Wishlist.create({

                user: req.user._id,

                products: []

            });

        }

        const index = wishlist.products.findIndex(

            item => item.toString() === productId

        );

        let wishlisted;

        if (index > -1) {

            wishlist.products.splice(index, 1);

            wishlisted = false;

        } else {

            wishlist.products.push(productId);

            wishlisted = true;

        }

        await wishlist.save();

res.status(200).json({

    success: true,

    wishlisted,

    count: wishlist.products.length,

    message: wishlisted
        ? "Added to wishlist"
        : "Removed from wishlist"

});

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


const getWishlist = async (req, res) => {

    try {

        const wishlist = await Wishlist.findOne({

            user: req.user._id

        }).populate({
            path: "products",
            select: "name slug price images badge category",
            populate: {
                path: "category",
                select: "name"
            }
        });

        // User has no wishlist yet
        if (!wishlist) {

            return res.status(200).json({

                success: true,

                wishlist: {

                    products: []

                }

            });

        }

        res.status(200).json({

            success: true,

            wishlist

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


const clearWishlist = async (req, res) => {

    try {

        const wishlist = await Wishlist.findOne({

            user: req.user._id

        });

        if (!wishlist) {

            return res.status(404).json({

                success: false,

                message: "Wishlist not found"

            });

        }

        wishlist.products = [];

        await wishlist.save();

        res.status(200).json({

            success: true,

            message: "Wishlist cleared",

            wishlist: {

                products: []

            },

            count: 0

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const getWishlistCount = async (req, res) => {

    try {

        const wishlist = await Wishlist.findOne({

            user: req.user._id

        });

        const count = wishlist ? wishlist.products.length : 0;

        res.status(200).json({

            success: true,

            count

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const isWishlisted = async (req, res) => {

    try {

        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({

            user: req.user._id

        });

        const exists = wishlist
            ? wishlist.products.some(
                item => item.toString() === productId
            )
            : false;

        res.status(200).json({

            success: true,
            wishlisted: exists

        });

    } catch (error) {

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

module.exports = {

    toggleWishlist,

    getWishlist,

    clearWishlist,

    getWishlistCount,

    isWishlisted

};