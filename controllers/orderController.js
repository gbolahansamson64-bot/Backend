const mongoose = require("mongoose");
const Order = require("../models/Order");

const Cart = require("../models/Cart");

const Product = require("../models/Product");

const stripe = require("../config/stripe");

const { createAdminNotification } = require("../utils/notificationService");

const createCheckoutSession = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            country,
            postalCode,
            paymentMethod
        } = req.body;

        // Determine the customer the same way the rest of the app does:
        // logged-in users via req.user, guests via the guestId cookie.
        const userId = req.user ? req.user._id.toString() : null;
        const guestId = req.user ? null : (req.cookies.guestId || null);

        if (!userId && !guestId) {

            console.error(
                "Checkout request is missing both a logged-in user and a guestId cookie."
            );

            return res.status(400).json({
                success: false,
                message: "Missing customer information."
            });

        }

        if (!firstName || !lastName || !email || !address || !city || !state || !country || !postalCode) {

            return res.status(400).json({
                success: false,
                message: "Please fill in all required shipping details."
            });

        }


        // -----------------------------------------
        // 6. Get customer's cart
        // -----------------------------------------

        const cart = await Cart.findOne(
            userId ? { user: userId } : { guestId }
        ).populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty."
            });
        }

        // -----------------------------------------
        // 3. Build Stripe line items
        // -----------------------------------------

        const lineItems = [];

        let subtotal = 0;

        for (const item of cart.items) {
            const product = item.product;

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "One of the products in your cart no longer exists."
                });
            }

            if (!product.isActive) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is currently unavailable.`
                });
            }

            if (item.quantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} has insufficient stock.`
                });
            }

            const itemTotal = product.price * item.quantity;

            subtotal += itemTotal;

            const productData = {
                name: product.name
            };

            // Only add image if the product actually has one.
            if (product.images && product.images.length > 0) {
                productData.images = [
                    `${process.env.CLIENT_URL}/assets/images/products/${product.images[0]}`
                ];
            }

            lineItems.push({
                price_data: {
                    currency: "usd",

                    product_data: productData,

                    // Stripe expects USD in cents.
                    unit_amount: Math.round(product.price * 100)
                },

                quantity: item.quantity
            });
        }

        // -----------------------------------------
        // 4. Create Stripe Checkout Session
        // -----------------------------------------

        const session = await stripe.checkout.sessions.create({
            mode: "payment",

            payment_method_types: ["card"],

            line_items: lineItems,

            customer_email: email,

            phone_number_collection: {
                enabled: true
            },

            shipping_address_collection: {
                allowed_countries: [
                    "US",
                    "NG",
                    "GB",
                    "CA"
                ]
            },

            success_url:
                `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
                `${process.env.CLIENT_URL}/cart.html`,

            metadata: {
                userId: req.user ? req.user._id.toString() : "",
                guestId: req.user ? "" : (req.cookies.guestId || ""),

                firstName,
                lastName,
                email,
                phone,
                address,
                city,
                state,
                country,
                postalCode,

                paymentMethod: paymentMethod || "card",

                subtotal: subtotal.toFixed(2)
            }
        });

        // -----------------------------------------
        // 5. Send Stripe Checkout URL to frontend
        // -----------------------------------------

        return res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error("CREATE CHECKOUT SESSION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create checkout session.",
            error: error.message
        });
    }
};

const getMyOrders = async (req, res) => {

    try {

        const orders = await Order.find({

            user: req.user._id

        })
        .populate("orderItems.product")
        .sort({ createdAt: -1 });

        res.status(200).json({

            success: true,

            count: orders.length,

            orders

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const getSingleOrder = async (req, res) => {

    try {

        const order = await Order.findById(

            req.params.orderId

        )
        .populate("orderItems.product")
        .populate(

            "user",

            "firstName lastName email"

        );

        if (!order) {

            return res.status(404).json({

                success: false,

                message: "Order not found"

            });

        }

        if (

            (!order.user || order.user._id.toString() !== req.user._id.toString())

            &&

            req.user.role !== "admin"

        ) {

            return res.status(403).json({

                success: false,

                message: "Access denied"

            });

        }

        res.status(200).json({

            success: true,

            order

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const cancelOrder = async (req, res) => {

    try {

        const order = await Order.findById(

            req.params.orderId

        );

        if (!order) {

            return res.status(404).json({

                success: false,

                message: "Order not found"

            });

        }

        if (

            !order.user ||

            order.user.toString() !== req.user._id.toString()

        ) {

            return res.status(403).json({

                success: false,

                message: "Access denied"

            });

        }

        if (

            order.orderStatus === "Shipped" ||

            order.orderStatus === "Delivered"

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Order cannot be cancelled"

            });

        }

        order.orderStatus = "Cancelled";

        await order.save();

        for (const item of order.orderItems) {

            await Product.findByIdAndUpdate(

                item.product,

                {

                    $inc: {

                        stock: item.quantity

                    }

                }

            );

        }

        res.status(200).json({

            success: true,

            message: "Order cancelled",

            order

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

const stripeWebhook = async (req, res) => {

    console.log("=================================");
    console.log("STRIPE WEBHOOK RECEIVED");
    console.log("=================================");

    const signature = req.headers["stripe-signature"];

    console.log("Stripe Signature exists:", !!signature);
    console.log(
        "Webhook Secret exists:",
        !!process.env.STRIPE_WEBHOOK_SECRET
    );

    let event;

    // -----------------------------------------
    // 1. Verify Stripe webhook signature
    // -----------------------------------------

    try {

        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log("✅ WEBHOOK SIGNATURE VERIFIED");
        console.log("Event Type:", event.type);
        console.log("Event ID:", event.id);

    } catch (error) {

        console.error(
            "❌ WEBHOOK SIGNATURE VERIFICATION FAILED"
        );

        console.error("Error:", error.message);

        return res.status(400).send(
            `Webhook Error: ${error.message}`
        );
    }


    // -----------------------------------------
    // 2. Only process completed checkout
    // -----------------------------------------

    if (event.type !== "checkout.session.completed") {

        return res.json({
            received: true
        });

    }


    console.log("=================================");
    console.log("CHECKOUT SESSION COMPLETED");
    console.log("=================================");


    try {

        const session = event.data.object;


        console.log(
            "Stripe Session ID:",
            session.id
        );

        console.log(
            "Payment Status:",
            session.payment_status
        );

        console.log(
            "Metadata:",
            session.metadata
        );


        // -----------------------------------------
        // 3. Make sure payment was actually successful
        // -----------------------------------------

        if (session.payment_status !== "paid") {

            console.log(
                "Payment is not completed. Skipping order creation."
            );

            return res.json({
                received: true,
                message: "Payment not completed"
            });

        }


        // -----------------------------------------
        // 4. Prevent duplicate orders
        // -----------------------------------------

        const existingOrder = await Order.findOne({
            stripeSessionId: session.id
        });


        if (existingOrder) {

            console.log(
                `Order already exists for Stripe session ${session.id}`
            );

            return res.json({
                received: true,
                message: "Order already exists"
            });

        }


        // -----------------------------------------
        // 5. Get customer information
        // -----------------------------------------

        const {
            userId,
            guestId,
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            country,
            postalCode,
            paymentMethod
        } = session.metadata;

        if (!userId && !guestId) {

            console.error(
                "Stripe session is missing both userId and guestId metadata."
            );

            return res.status(400).json({
                success: false,
                message: "Missing customer information."
            });

        }


        // -----------------------------------------
        // 2. Get the cart — logged-in user or guest
        // -----------------------------------------

        const cartFilter = userId ? { user: userId } : { guestId };

        const cart = await Cart.findOne(cartFilter).populate("items.product");


        if (!cart || cart.items.length === 0) {

            console.error(
                `Cart not found or empty for user ${userId}`
            );

            return res.status(400).json({
                success: false,
                message: "Customer cart is empty."
            });

        }


        // -----------------------------------------
        // 7. Re-check products and stock
        // -----------------------------------------

        const orderItems = [];

        let subtotal = 0;


        for (const item of cart.items) {

            const product = item.product;


            if (!product) {

                throw new Error(
                    "One of the products in the cart no longer exists."
                );

            }


            // Product must still be active

            if (!product.isActive) {

                throw new Error(
                    `${product.name} is no longer available.`
                );

            }


            // Check stock again at payment time

            if (item.quantity > product.stock) {

                throw new Error(
                    `${product.name} does not have enough stock.`
                );

            }


            orderItems.push({

                product: product._id,

                name: product.name,

                image:
                    product.images &&
                    product.images.length > 0
                        ? product.images[0]
                        : "",

                quantity: item.quantity,

                price: product.price

            });


            subtotal +=
                product.price * item.quantity;

        }


        // -----------------------------------------
        // 8. Reduce stock safely
        // -----------------------------------------

        for (const item of cart.items) {

            const updatedProduct =
                await Product.findOneAndUpdate(

                    {
                        _id: item.product._id,

                        stock: {
                            $gte: item.quantity
                        }
                    },

                    {
                        $inc: {
                            stock: -item.quantity
                        }
                    },

                    {
                        new: true
                    }

                );


            if (!updatedProduct) {

                throw new Error(
                    `Unable to reduce stock for ${item.product.name}. Stock may have changed.`
                );

            }

        }


        // -----------------------------------------
        // 9. Create order
        // -----------------------------------------

        const newOrder = await Order.create({

            user: userId || null,

            customerEmail: email,

            orderItems,


            shippingAddress: {

                firstName,

                lastName,

                phone,

                address,

                city,

                state,

                country,

                postalCode

            },


            subtotal,

            shippingFee: 0,

            tax: 0,

            total: subtotal,


            paymentMethod:
                paymentMethod || "card",


            paymentStatus: "Paid",

            orderStatus: "Processing",


            stripeSessionId:
                session.id,


            stripeCustomerId:
                session.customer,


            stripePaymentIntentId:
                session.payment_intent

        });

        


        console.log(
            `✅ Order created successfully: ${newOrder._id}`
        );

        await createAdminNotification({
    title: "New Order Received",
    message: `A new order from ${firstName} ${lastName} has been paid successfully.`,
    type: "order",
    referenceId: newOrder._id,
    referenceType: "Order",
    metadata: {
        orderId: newOrder._id,
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        total: newOrder.total,
        paymentStatus: newOrder.paymentStatus
    }
});


        // -----------------------------------------
        // 10. Clear customer's cart
        // -----------------------------------------

        cart.items = [];

        await cart.save();


        console.log(
            `✅ Cart cleared for user ${userId}`
        );


        // -----------------------------------------
        // 11. Webhook completed successfully
        // -----------------------------------------

        console.log("=================================");
        console.log("✅ ORDER PROCESSING COMPLETE");
        console.log("=================================");


        return res.status(200).json({

            received: true,

            success: true,

            orderId: newOrder._id

        });


    } catch (error) {

        console.error(
            "❌ ORDER CREATION ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to complete order processing."

        });

    }

};

const verifyPayment = async (req, res) => {
    try {

        const sessionId = req.params.sessionId;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Stripe session ID is required"
            });
        }

        // -----------------------------------------
        // 1. Retrieve the Checkout Session from Stripe
        // -----------------------------------------

        const session = await stripe.checkout.sessions.retrieve(
            sessionId
        );

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Stripe session not found"
            });
        }

        // -----------------------------------------
        // 2. Make sure payment was actually completed
        // -----------------------------------------

        if (session.payment_status !== "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment has not been completed"
            });
        }

        // -----------------------------------------
        // 3. Find the order created by the webhook
        // -----------------------------------------

        const order = await Order.findOne({
            stripeSessionId: session.id
        }).populate("orderItems.product");

        // -----------------------------------------
        // 4. Webhook may still be processing
        // -----------------------------------------

        if (!order) {
            return res.status(202).json({
                success: false,
                processing: true,
                message: "Payment received. Your order is still being processed."
            });
        }

        // -----------------------------------------
        // 5. Return the order
        // -----------------------------------------

        return res.status(200).json({
            success: true,
            order
        });

    } catch (error) {

        console.error(
            "VERIFY PAYMENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify payment.",
            error: error.message
        });
    }
};

module.exports = {

    createCheckoutSession,

    verifyPayment,

    getMyOrders,

    getSingleOrder,

    cancelOrder,

    stripeWebhook

};
