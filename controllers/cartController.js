const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const GUEST_CART_COOKIE = "blegab_guest_cart_id";


// ============================================================
// GET OR CREATE GUEST CART ID
// ============================================================

const getGuestCartId = (req, res) => {
    let guestCartId = req.cookies?.[GUEST_CART_COOKIE];

    if (!guestCartId) {
        guestCartId = new mongoose.Types.ObjectId().toString();

        res.cookie(
            GUEST_CART_COOKIE,
            guestCartId,
            {
                httpOnly: true,
                sameSite: "lax",
                secure: false,
                maxAge: 1000 * 60 * 60 * 24 * 30
            }
        );
    }

    return guestCartId;
};


// ============================================================
// FIND CART FOR CURRENT CUSTOMER
// ============================================================

const getCartOwnerQuery = (req, res) => {

    // Logged-in customer
    if (req.user) {
        return {
            user: req.user._id
        };
    }

    // Guest customer
    const guestCartId = getGuestCartId(req, res);

    return {
        guestId: guestCartId
    };
};


// ============================================================
// BUILD CART RESPONSE
// ============================================================

const buildCartResponse = (cart) => {

    let totalItems = 0;
    let subtotal = 0;

    if (!cart) {
        return {
            cart: {
                items: []
            },
            totalItems: 0,
            subtotal: 0
        };
    }

    const items = cart.items
        .filter(item => item.product)
        .map(item => {

            const lineTotal =
                item.product.price * item.quantity;

            totalItems += item.quantity;
            subtotal += lineTotal;

            return {
                product: item.product,
                quantity: item.quantity,
                lineTotal
            };
        });

    return {
        cart: {
            _id: cart._id,
            user: cart.user || null,
            items
        },

        totalItems,
        subtotal
    };
};


// ============================================================
// ADD TO CART
// ============================================================

const addToCart = async (req, res) => {

    try {

        const { productId } = req.body;

        const quantity =
            Number(req.body.quantity || 1);

        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Quantity must be a whole number greater than 0"
            });
        }


        if (
            !mongoose.Types.ObjectId.isValid(productId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }


        const product =
            await Product.findById(productId);


        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }


        if (product.stock <= 0) {
            return res.status(400).json({
                success: false,
                message:
                    "This product is out of stock"
            });
        }


        if (!product.isActive) {
            return res.status(400).json({
                success: false,
                message:
                    "This product is unavailable"
            });
        }


        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Not enough stock available"
            });
        }


        // ----------------------------------------------------
        // Find user's cart OR guest cart
        // ----------------------------------------------------

        const ownerQuery =
            getCartOwnerQuery(req, res);


        let cart =
            await Cart.findOne(ownerQuery);


        // ----------------------------------------------------
        // Create cart if it doesn't exist
        // ----------------------------------------------------

        if (!cart) {

            const cartData = {
                items: []
            };

            if (req.user) {
                cartData.user = req.user._id;
            } else {
                cartData.guestId =
                    getGuestCartId(req, res);
            }

            cart = await Cart.create(cartData);
        }


        // ----------------------------------------------------
        // Check if product already exists
        // ----------------------------------------------------

        const existingItem =
            cart.items.find(item =>
                item.product.toString() === productId
            );


        if (existingItem) {

            const newQuantity =
                existingItem.quantity + quantity;


            if (newQuantity > product.stock) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Not enough stock available"
                });
            }


            existingItem.quantity =
                newQuantity;

        } else {

            cart.items.push({
                product: productId,
                quantity
            });
        }


        await cart.save();


        await cart.populate({
            path: "items.product",
            select:
                "name price images stock badge slug brand rating numReviews length capSize laceType status isActive"
        });


        const cartData =
            buildCartResponse(cart);


        return res.status(200).json({

            success: true,

            message:
                "Product added to cart",

            ...cartData
        });


    } catch (error) {

        console.error(
            "ADD TO CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


// ============================================================
// GET CART
// ============================================================

const getCart = async (req, res) => {

    try {

        const ownerQuery =
            getCartOwnerQuery(req, res);


        const cart =
            await Cart.findOne(ownerQuery)
                .populate({
                    path: "items.product",
                    select:
                        "name price images stock badge slug brand rating numReviews length capSize laceType status isActive"
                });


        const cartData =
            buildCartResponse(cart);


        return res.status(200).json({

            success: true,

            ...cartData
        });


    } catch (error) {

        console.error(
            "GET CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


// ============================================================
// UPDATE CART ITEM
// ============================================================

const updateCartItem = async (req, res) => {

    try {

        const quantity =
            Number(req.body.quantity);


        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Quantity must be a whole number greater than 0"
            });
        }


        const { productId } =
            req.params;


        if (
            !mongoose.Types.ObjectId.isValid(productId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid product ID"
            });
        }


        const product =
            await Product.findById(productId);


        if (!product) {

            return res.status(404).json({

                success: false,

                message:
                    "Product not found"
            });
        }


        if (quantity > product.stock) {

            return res.status(400).json({

                success: false,

                message:
                    "Quantity exceeds available stock"
            });
        }


        const ownerQuery =
            getCartOwnerQuery(req, res);


        const cart =
            await Cart.findOne(ownerQuery);


        if (!cart) {

            return res.status(404).json({

                success: false,

                message:
                    "Cart not found"
            });
        }


        const item =
            cart.items.find(item =>
                item.product.toString() === productId
            );


        if (!item) {

            return res.status(404).json({

                success: false,

                message:
                    "Item not found"
            });
        }


        item.quantity = quantity;


        await cart.save();


        await cart.populate({
            path: "items.product",
            select:
                "name price images stock badge slug brand rating numReviews length capSize laceType status isActive"
        });


        const cartData =
            buildCartResponse(cart);


        return res.status(200).json({

            success: true,

            message:
                "Cart updated",

            ...cartData
        });


    } catch (error) {

        console.error(
            "UPDATE CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


// ============================================================
// REMOVE CART ITEM
// ============================================================

const removeCartItem = async (req, res) => {

    try {

        const { productId } =
            req.params;


        if (
            !mongoose.Types.ObjectId.isValid(productId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid product ID"
            });
        }


        const ownerQuery =
            getCartOwnerQuery(req, res);


        const cart =
            await Cart.findOne(ownerQuery);


        if (!cart) {

            return res.status(404).json({

                success: false,

                message:
                    "Cart not found"
            });
        }


        const originalLength =
            cart.items.length;


        cart.items =
            cart.items.filter(item =>
                item.product.toString() !== productId
            );


        if (
            cart.items.length === originalLength
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Item not found in cart"
            });
        }


        await cart.save();


        await cart.populate({
            path: "items.product",
            select:
                "name price images stock badge slug brand rating numReviews length capSize laceType status isActive"
        });


        const cartData =
            buildCartResponse(cart);


        return res.status(200).json({

            success: true,

            message:
                "Item removed",

            ...cartData
        });


    } catch (error) {

        console.error(
            "REMOVE CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


// ============================================================
// CLEAR CART
// ============================================================

const clearCart = async (req, res) => {

    try {

        const ownerQuery =
            getCartOwnerQuery(req, res);


        const cart =
            await Cart.findOne(ownerQuery);


        if (!cart) {

            return res.status(200).json({

                success: true,

                message:
                    "Cart already empty",

                cart: {
                    items: []
                },

                totalItems: 0,

                subtotal: 0
            });
        }


        cart.items = [];


        await cart.save();


        return res.status(200).json({

            success: true,

            message:
                "Cart cleared",

            cart: {
                items: []
            },

            totalItems: 0,

            subtotal: 0
        });


    } catch (error) {

        console.error(
            "CLEAR CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


// ============================================================
// GET CART COUNT
// ============================================================

const getCartCount = async (req, res) => {

    try {

        const ownerQuery =
            getCartOwnerQuery(req, res);


        const cart =
            await Cart.findOne(ownerQuery);


        let count = 0;


        if (cart) {

            cart.items.forEach(item => {

                count += item.quantity;

            });
        }


        return res.status(200).json({

            success: true,

            count
        });


    } catch (error) {

        console.error(
            "GET CART COUNT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


module.exports = {

    addToCart,

    getCart,

    updateCartItem,

    removeCartItem,

    clearCart,

    getCartCount
};