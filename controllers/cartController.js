const Cart = require("../models/Cart");
const Product = require("../models/Product");

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

    const items = cart.items.map(item => {

        const lineTotal = item.product.price * item.quantity;

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
            user: cart.user,
            items
        },

        totalItems,
        subtotal

    };

};

const addToCart = async (req, res) => {

    try {

        const { productId, quantity } = req.body;

        const product = await Product.findById(productId);

if (!product) {

    return res.status(404).json({

        success: false,

        message: "Product not found"

    });

}

if (!product.isActive) {

    return res.status(400).json({

        success: false,

        message: "This product is unavailable"

    });

}

if (product.stock < (quantity || 1)) {

    return res.status(400).json({

        success: false,

        message: "Not enough stock available"

    });

}

        let cart = await Cart.findOne({

            user: req.user._id

        });

        if (!cart) {

            cart = await Cart.create({

                user: req.user._id,

                items: []

            });

        }

        const existingItem = cart.items.find(

            item =>

            item.product.toString() ===

            productId

        );

        if (existingItem) {

    const newQuantity = existingItem.quantity + (quantity || 1);

    if (newQuantity > product.stock) {

        return res.status(400).json({

            success: false,

            message: "Not enough stock available"

        });

    }

    existingItem.quantity = newQuantity;

} else {

    cart.items.push({

        product: productId,

        quantity: quantity || 1

    });

}

        await cart.save();

        await cart.populate({

        path: "items.product",

        select: "name price images stock badge"

        });

        const cartData = buildCartResponse(cart);

        res.status(200).json({

            success: true,

            message: "Product added to cart",

            ...cartData
        
        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const getCart = async (req, res) => {

    try {

        const cart = await Cart.findOne({

            user: req.user._id

        }).populate({ path: "items.product", select: "name price images stock badge"});

       const cartData = buildCartResponse(cart);

       res.status(200).json({

       success: true,

       ...cartData

      });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const updateCartItem = async (req, res) => {

    try {

        const { quantity } = req.body;

        const { productId } = req.params;

        const product = await Product.findById(productId);

if (!product) {

    return res.status(404).json({

        success: false,

        message: "Product not found"

    });

}

if (quantity < 1) {

    return res.status(400).json({

        success: false,

        message: "Quantity must be at least 1"

    });

}

if (quantity > product.stock) {

    return res.status(400).json({

        success: false,

        message: "Quantity exceeds available stock"

    });

}

        const cart = await Cart.findOne({

            user: req.user._id

        });

        if (!cart) {

            return res.status(404).json({

                success: false,

                message: "Cart not found"

            });

        }

        const item = cart.items.find(

            item =>

            item.product.toString() ===

            productId

        );

        if (!item) {

            return res.status(404).json({

                success: false,

                message: "Item not found"

            });

        }

        item.quantity = quantity;

        await cart.save();

        await cart.populate({

        path: "items.product",

        select: "name price images stock badge"

        });

        const cartData = buildCartResponse(cart);

        res.status(200).json({

            success: true,

            message: "Cart updated",

            ...cartData

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const removeCartItem = async (req, res) => {

    try {

        const { productId } = req.params;

        const cart = await Cart.findOne({

            user: req.user._id

        });

        if (!cart) {

            return res.status(404).json({

                success: false,

                message: "Cart not found"

            });

        }

        cart.items = cart.items.filter(

            item =>

            item.product.toString() !==

            productId

        );

        await cart.save();

        await cart.populate({

        path: "items.product",

        select: "name price images stock badge"

        });

        const cartData = buildCartResponse(cart);

         res.status(200).json({

             success: true,

             message: "Item removed",

             ...cartData

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const clearCart = async (req, res) => {

    try {

        const cart = await Cart.findOne({

            user: req.user._id

        });

        if (!cart) {

            return res.status(404).json({

                success: false,

                message: "Cart not found"

            });

        }

        cart.items = [];

        await cart.save();

        res.status(200).json({

            success: true,

            message: "Cart cleared",

            cart: {

                items: []

            },

            totalItems: 0,

            subtotal: 0

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const getCartCount = async (req, res) => {

    try {

        const cart = await Cart.findOne({

            user: req.user._id

        });

        let count = 0;

        if (cart) {

            cart.items.forEach(item => {

                count += item.quantity;

            });

        }

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

module.exports = {

    addToCart,

    getCart,

    updateCartItem,

    removeCartItem,

    clearCart,

    getCartCount

};