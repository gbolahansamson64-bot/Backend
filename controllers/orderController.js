const mongoose = require("mongoose");

const Order = require("../models/Order");

const Cart = require("../models/Cart");

const Product = require("../models/Product");

const CheckoutSession = require("../models/CheckoutSession");

const ShippingRule = require("../models/ShippingRule");

const stripe = require("../config/stripe");

const { calculateShipping } = require("../services/shippingService");

const sendEmail = require("../utils/sendEmail");

const orderConfirmation = require("../templates/orderConfirmation");

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
            paymentMethod,

            // Guest checkout sends these items
            // from the frontend cart.
            items
        } = req.body;


        // ==================================================
// 1. VALIDATE CUSTOMER INFORMATION
// ==================================================

const cleanFirstName =
    typeof firstName === "string"
        ? firstName.trim()
        : "";

const cleanLastName =
    typeof lastName === "string"
        ? lastName.trim()
        : "";

const cleanEmail =
    typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

const cleanPhone =
    typeof phone === "string"
        ? phone.trim()
        : "";

const cleanAddress =
    typeof address === "string"
        ? address.trim()
        : "";

const cleanCity =
    typeof city === "string"
        ? city.trim()
        : "";

const cleanState =
    typeof state === "string"
        ? state.trim()
        : "";

const cleanCountry =
    typeof country === "string"
        ? country.trim()
        : "";

const cleanPostalCode =
    typeof postalCode === "string"
        ? postalCode.trim()
        : "";


if (
    !cleanFirstName ||
    !cleanLastName ||
    !cleanEmail ||
    !cleanPhone ||
    !cleanAddress ||
    !cleanCity ||
    !cleanState ||
    !cleanCountry ||
    !cleanPostalCode
) {

    return res.status(400).json({
        success: false,
        message:
            "Please complete all customer and shipping information."
    });

}


// Basic email validation

const emailIsValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
    );


if (!emailIsValid) {

    return res.status(400).json({
        success: false,
        message:
            "Please provide a valid email address."
    });

}


        // ==================================================
        // 2. DETERMINE CUSTOMER TYPE
        // ==================================================

        const isGuest = !req.user;

        let guestId = null;

if (isGuest) {

    guestId =
        req.cookies?.blegab_guest_cart_id || null;

}


        console.log(
            `CHECKOUT TYPE: ${
                isGuest
                    ? "GUEST"
                    : "REGISTERED CUSTOMER"
            }`
        );


        // ==================================================
        // 3. GET CART ITEMS
        // ==================================================

        let cartItems = [];


        // --------------------------------------------------
        // REGISTERED CUSTOMER
        // --------------------------------------------------

        if (!isGuest) {

            const cart = await Cart.findOne({
                user: req.user._id
            }).populate("items.product");


            if (
                !cart ||
                !cart.items ||
                cart.items.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Your cart is empty."
                });

            }


            cartItems = cart.items;

        }


        // --------------------------------------------------
        // GUEST CUSTOMER
        // --------------------------------------------------

        else {

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Your cart is empty."
                });

            }


            /*
             * Guest items should look like:
             *
             * [
             *   {
             *     productId: "...",
             *     quantity: 2
             *   }
             * ]
             */


            const productIds =
                items.map(item => item.productId);


            const products =
                await Product.find({
                    _id: {
                        $in: productIds
                    }
                });


            const productMap = new Map(
                products.map(product => [
                    product._id.toString(),
                    product
                ])
            );


            cartItems = items.map(item => {

                const product =
                    productMap.get(
                        item.productId
                    );


                return {
                    product,
                    quantity: Number(
                        item.quantity
                    )
                };

            });

        }


        // ==================================================
        // 4. VALIDATE PRODUCTS + CALCULATE SUBTOTAL
        // ==================================================

        const lineItems = [];

        const checkoutItems = [];

        let subtotal = 0;


        for (const item of cartItems) {

            const product = item.product;

            const quantity =
                Number(item.quantity);


            // --------------------------------------------------
            // Product existence
            // --------------------------------------------------

            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "One of the products in your cart no longer exists."
                });

            }


            // --------------------------------------------------
            // Quantity validation
            // --------------------------------------------------

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Invalid quantity for ${product.name}.`
                });

            }


            // --------------------------------------------------
            // Product active
            // --------------------------------------------------

            if (!product.isActive) {

                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} is currently unavailable.`
                });

            }


            // --------------------------------------------------
            // Stock validation
            // --------------------------------------------------

            if (
                quantity > product.stock
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} has insufficient stock.`
                });

            }


            // --------------------------------------------------
            // Calculate price FROM DATABASE
            // --------------------------------------------------

            const itemTotal =
                product.price * quantity;


            subtotal += itemTotal;


            // --------------------------------------------------
            // Snapshot item
            // --------------------------------------------------

            checkoutItems.push({

                product: product._id,

                name: product.name,

                image:
                    product.images &&
                    product.images.length > 0
                        ? product.images[0]
                        : "",

                quantity,

                price: product.price

            });


            // --------------------------------------------------
            // Stripe line item
            // --------------------------------------------------

            const productData = {
                name: product.name
            };


            if (
    product.images &&
    product.images.length > 0
) {

    productData.images = [
        product.images[0]
    ];

}


            lineItems.push({

                price_data: {

                    currency: "usd",

                    product_data:
                        productData,

                    unit_amount:
                        Math.round(
                            product.price * 100
                        )

                },

                quantity

            });

        }


        // ==================================================
// 5. CALCULATE SHIPPING
// ==================================================

const shippingRules =
    await ShippingRule.find({
        available: true
    }).select("countryCode");

const allowedShippingCountries =
    shippingRules.map(
        rule => rule.countryCode
    );

    console.log(
    "ALLOWED SHIPPING COUNTRIES SENT TO STRIPE:",
    allowedShippingCountries
);

    if (allowedShippingCountries.length === 0) {

    return res.status(400).json({

        success: false,

        message:
            "No shipping countries are currently available."

    });

}


const shippingResult =
    await calculateShipping(cleanCountry, subtotal);


// --------------------------------------------------
// Unsupported country
// --------------------------------------------------

if (!shippingResult.available) {

    return res.status(400).json({
        success: false,
        message: shippingResult.message
    });

}


const shippingFee =
    shippingResult.shippingFee;

    const shippingRuleId =
    shippingResult.shippingRuleId;


// ==================================================
// 6. CALCULATE TOTAL
// ==================================================

const tax = 0;

const total =
    subtotal +
    shippingFee +
    tax;


        // ==================================================
        // 6. CREATE OUR CHECKOUT SNAPSHOT
        // ==================================================

        const checkoutSession =
    await CheckoutSession.create({

    user:
        req.user
            ? req.user._id
            : null,

    guestId,

    isGuest,

    customerEmail:
        cleanEmail,

        firstName:
            cleanFirstName,

        lastName:
            cleanLastName,

        phone:
            cleanPhone,

        shippingAddress: {

            address:
                cleanAddress,

            city:
                cleanCity,

            state:
                cleanState,

            country:
                cleanCountry,

            postalCode:
                cleanPostalCode

        },

        items:
        checkoutItems,

        subtotal,

        shippingFee,

        shippingRuleId,

        tax,

        total,

        paymentMethod:
            paymentMethod || "card"

    });


        // ==================================================
        // 7. CREATE STRIPE SESSION
        // ==================================================

        let session;


        try {

            session =
                await stripe.checkout.sessions.create({

                    mode: "payment",

                    // payment_method_types: [
                    //     "card"
                    // ],

                    line_items:
                     lineItems,

shipping_options: [
    {
        shipping_rate_data: {
            type: "fixed_amount",

            fixed_amount: {
                amount:
                    Math.round(
                        shippingFee * 100
                    ),

                currency: "usd"
            },

            display_name:
    shippingFee === 0
        ? "Free Shipping"
        : `Shipping to ${shippingResult.country}`
        }
    }
],

                    customer_email:
                        cleanEmail,

                    phone_number_collection: {
                        enabled: true
                    },

                    shipping_address_collection: {
                       allowed_countries:
                       allowedShippingCountries
                    },

                    success_url:
                        `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

                    cancel_url:
                        `${process.env.CLIENT_URL}/cart.html`,

                    metadata: {

                        checkoutSessionId:
                            checkoutSession._id.toString(),

                        userId:
                            req.user
                                ? req.user._id.toString()
                                : "",

                        isGuest:
                            isGuest
                                ? "true"
                                : "false"

                    }

                });


        } catch (stripeError) {

            // If Stripe fails, remove the unused
            // checkout snapshot.

            await CheckoutSession.findByIdAndDelete(
                checkoutSession._id
            );

            throw stripeError;

        }


        // ==================================================
        // 8. SAVE STRIPE SESSION ID
        // ==================================================

        checkoutSession.stripeSessionId =
            session.id;

        await checkoutSession.save();


        // ==================================================
        // 9. RETURN CHECKOUT URL
        // ==================================================

        return res.status(200).json({

            success: true,

            sessionId:
                session.id,

            url:
                session.url

        });


    } catch (error) {

        console.error(
            "CREATE CHECKOUT SESSION ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to create checkout session.",

            error:
                error.message

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

const trackOrder = async (req, res) => {

    try {

        const { orderId, email } = req.body;

        // -----------------------------------------
        // Validate input
        // -----------------------------------------

        if (!orderId || !email) {

            return res.status(400).json({
                success: false,
                message: "Order ID and email are required."
            });

        }


        // -----------------------------------------
        // Validate Order ID
        // -----------------------------------------

        if (!mongoose.Types.ObjectId.isValid(orderId)) {

            return res.status(400).json({
                success: false,
                message: "Invalid order ID."
            });

        }


        // -----------------------------------------
        // Normalize email
        // -----------------------------------------

        const normalizedEmail =
            email.trim().toLowerCase();


        // -----------------------------------------
        // Find order
        // -----------------------------------------

        const order = await Order.findOne({
            _id: orderId,
            customerEmail: normalizedEmail
        })
        .populate("orderItems.product")
        .populate(
            "user",
            "firstName lastName email"
        );


        // -----------------------------------------
        // Order not found
        // -----------------------------------------

        if (!order) {

            return res.status(404).json({
                success: false,
                message:
                    "No order was found with that order ID and email."
            });

        }


        // -----------------------------------------
        // Return tracking information
        // -----------------------------------------

        return res.status(200).json({

            success: true,

            order: {

                id: order._id,

                customerEmail:
                    order.customerEmail,

                items:
                    order.orderItems,

                subtotal:
                    order.subtotal,

                shippingFee:
                    order.shippingFee,

                tax:
                    order.tax,

                total:
                    order.total,

                paymentMethod:
                    order.paymentMethod,

                paymentStatus:
                    order.paymentStatus,

                orderStatus:
                    order.orderStatus,

                shippingAddress:
                    order.shippingAddress,

                createdAt:
                    order.createdAt,

                updatedAt:
                    order.updatedAt

            }

        });


    } catch (error) {

        console.error(
            "TRACK ORDER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to track order."

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

        const isAdmin =
    req.user && req.user.role === "admin";

const isOwner =
    req.user &&
    order.user &&
    order.user._id.toString() ===
        req.user._id.toString();

if (!isAdmin && !isOwner) {

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

            order.user.toString() !==

            req.user._id.toString()

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

    console.log(
        "Stripe Signature exists:",
        !!signature
    );

    console.log(
        "Webhook Secret exists:",
        !!process.env.STRIPE_WEBHOOK_SECRET
    );

    let event;


    // ==================================================
    // 1. VERIFY STRIPE WEBHOOK SIGNATURE
    // ==================================================

    try {

        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log(
            "✅ WEBHOOK SIGNATURE VERIFIED"
        );

        console.log(
            "Event Type:",
            event.type
        );

        console.log(
            "Event ID:",
            event.id
        );

    } catch (error) {

        console.error(
            "❌ WEBHOOK SIGNATURE VERIFICATION FAILED"
        );

        console.error(
            "Error:",
            error.message
        );

        return res.status(400).send(
            `Webhook Error: ${error.message}`
        );
    }


    // ==================================================
    // 2. ONLY PROCESS COMPLETED CHECKOUT
    // ==================================================

    if (
        event.type !==
        "checkout.session.completed"
    ) {

        return res.json({
            received: true
        });

    }


    console.log("=================================");
    console.log(
        "CHECKOUT SESSION COMPLETED"
    );
    console.log("=================================");


    try {

        const session =
            event.data.object;


        console.log(
            "Stripe Session ID:",
            session.id
        );

        console.log(
            "Payment Status:",
            session.payment_status
        );

        console.log(
            "Stripe Metadata:",
            session.metadata
        );


        // ==================================================
        // 3. MAKE SURE PAYMENT WAS SUCCESSFUL
        // ==================================================

        if (
            session.payment_status !==
            "paid"
        ) {

            console.log(
                "Payment is not completed."
            );

            return res.json({

                received: true,

                message:
                    "Payment not completed"

            });

        }


        // ==================================================
        // 4. GET OUR CHECKOUT SESSION ID
        // ==================================================

        const checkoutSessionId =
            session.metadata &&
            session.metadata.checkoutSessionId;


        if (!checkoutSessionId) {

            console.error(
                "❌ Missing checkoutSessionId metadata."
            );

            return res.status(400).json({

                success: false,

                message:
                    "Missing checkout session information."

            });

        }


        console.log(
            "CheckoutSession ID:",
            checkoutSessionId
        );


        // ==================================================
        // 5. FIND OUR CHECKOUT SNAPSHOT
        // ==================================================

        const checkoutSession =
            await CheckoutSession.findById(
                checkoutSessionId
            );


        if (!checkoutSession) {

            console.error(
                `CheckoutSession ${checkoutSessionId} not found.`
            );

            return res.status(404).json({

                success: false,

                message:
                    "Checkout session not found."

            });

        }


        // ==================================================
        // 6. PREVENT DUPLICATE PROCESSING
        // ==================================================

        if (
            checkoutSession.status ===
                "Completed" ||
            checkoutSession.paymentStatus ===
                "Paid"
        ) {

            console.log(
                `CheckoutSession ${checkoutSessionId} already processed.`
            );

            return res.json({

                received: true,

                success: true,

                message:
                    "Checkout already processed."

            });

        }


        // ==================================================
        // 7. VERIFY STRIPE TOTAL AGAINST OUR SNAPSHOT
        // ==================================================

        const expectedAmount =
            Math.round(
                checkoutSession.total * 100
            );

        const stripeAmount =
            session.amount_total;


        console.log(
            "Expected amount:",
            expectedAmount
        );

        console.log(
            "Stripe amount:",
            stripeAmount
        );


        if (
            stripeAmount !==
            expectedAmount
        ) {

            console.error(
                "❌ PAYMENT AMOUNT MISMATCH"
            );

            console.error(
                `Expected ${expectedAmount} cents but Stripe paid ${stripeAmount} cents.`
            );

            return res.status(400).json({

                success: false,

                message:
                    "Payment amount does not match checkout total."

            });

        }


        // ==================================================
// 8. PROCESS ORDER
// ==================================================
//
// NOTE:
// We are intentionally NOT using a MongoDB transaction here
// because the current local MongoDB instance is running as a
// standalone server and not as a replica set.
//
// Stock updates are still performed atomically using
// findOneAndUpdate with stock >= quantity.
//

let newOrder;


// ==================================================
// 8A. RELOAD CHECKOUT SESSION
// ==================================================

const currentCheckout =
    await CheckoutSession.findById(
        checkoutSessionId
    );


if (!currentCheckout) {

    throw new Error(
        "Checkout session no longer exists."
    );

}


// ==================================================
// 8B. DOUBLE-CHECK PROCESSING STATUS
// ==================================================

if (
    currentCheckout.status === "Completed" ||
    currentCheckout.paymentStatus === "Paid"
) {

    console.log(
        "Checkout already completed."
    );

    return res.json({

        received: true,

        success: true,

        message:
            "Checkout already processed."

    });

}


// ==================================================
// 8C. VALIDATE ALL PRODUCTS
// ==================================================

const orderItems = [];


for (
    const item
    of currentCheckout.items
) {

    const product =
        await Product.findById(
            item.product
        );


    if (!product) {

        throw new Error(
            `Product ${item.name} no longer exists.`
        );

    }


    if (!product.isActive) {

        throw new Error(
            `${product.name} is no longer available.`
        );

    }


    if (
        item.quantity >
        product.stock
    ) {

        throw new Error(
            `${product.name} does not have enough stock.`
        );

    }


    // ==========================================
    // BUILD ORDER ITEM FROM CHECKOUT SNAPSHOT
    // ==========================================

    orderItems.push({

        product:
            product._id,

        name:
            item.name,

        image:
            item.image || "",

        quantity:
            item.quantity,

        price:
            item.price

    });

}


// ==================================================
// 8D. REDUCE STOCK ATOMICALLY
// ==================================================

for (
    const item
    of currentCheckout.items
) {

    const updatedProduct =
        await Product.findOneAndUpdate(

            {
                _id:
                    item.product,

                stock: {
                    $gte:
                        item.quantity
                }
            },

            {
                $inc: {
                    stock:
                        -item.quantity
                }
            },

            {
                new: true
            }

        );


    if (!updatedProduct) {

        throw new Error(
            `Unable to reduce stock for ${item.name}. Stock may have changed.`
        );

    }

}


// ==================================================
// 8E. CREATE ORDER
// ==================================================

newOrder =
    await Order.create({

        user:
            currentCheckout.user ||
            null,

        customerEmail:
            currentCheckout.customerEmail,

        orderItems:
            orderItems,

        shippingAddress: {

            firstName:
                currentCheckout.firstName,

            lastName:
                currentCheckout.lastName,

            phone:
                currentCheckout.phone,

            address:
                currentCheckout
                    .shippingAddress
                    .address,

            city:
                currentCheckout
                    .shippingAddress
                    .city,

            state:
                currentCheckout
                    .shippingAddress
                    .state,

            country:
                currentCheckout
                    .shippingAddress
                    .country,

            postalCode:
                currentCheckout
                    .shippingAddress
                    .postalCode

        },

        subtotal:
            currentCheckout.subtotal,

        shippingFee:
            currentCheckout.shippingFee,

        shippingRuleId:
            currentCheckout.shippingRuleId,

        tax:
            currentCheckout.tax,

        total:
            currentCheckout.total,

        paymentMethod:
            currentCheckout.paymentMethod ||
            "card",

        paymentStatus:
            "Paid",

        orderStatus:
            "Processing",

        stripeSessionId:
            session.id,

        stripeCustomerId:
            session.customer,

        stripePaymentIntentId:
            session.payment_intent

    });


// ==================================================
// 8F. MARK CHECKOUT SESSION AS COMPLETED
// ==================================================

currentCheckout.paymentStatus =
    "Paid";

currentCheckout.status =
    "Completed";

currentCheckout.stripeSessionId =
    session.id;

currentCheckout.stripeEventId =
    event.id;

currentCheckout.order =
    newOrder._id;


await currentCheckout.save();


// ==================================================
// 8G. CLEAR CART AFTER SUCCESSFUL PAYMENT
// ==================================================
//
// Logged-in customer:
//     Cart is identified by user.
//
// Guest customer:
//     Cart is identified by the guest cart cookie.
//
// IMPORTANT:
// The CheckoutSession itself must remember the guestId
// so the webhook can find the correct guest cart.
//

if (currentCheckout.user) {

    // --------------------------------------------------
    // REGISTERED CUSTOMER CART
    // --------------------------------------------------

    const cart = await Cart.findOne({
        user: currentCheckout.user
    });

    if (cart) {

        cart.items = [];

        await cart.save();

        console.log(
            "✅ REGISTERED CUSTOMER CART CLEARED"
        );

    }

} else {

    // --------------------------------------------------
    // GUEST CUSTOMER CART
    // --------------------------------------------------

    if (currentCheckout.guestId) {

        const guestCart =
            await Cart.findOne({
                guestId:
                    currentCheckout.guestId
            });

        if (guestCart) {

            guestCart.items = [];

            await guestCart.save();

            console.log(
                "✅ GUEST CUSTOMER CART CLEARED"
            );

        } else {

            console.log(
                "ℹ️ No guest cart found to clear."
            );

        }

    } else {

        console.log(
            "⚠️ Guest checkout has no guestId. Guest cart cannot be identified."
        );

    }

}


        // ==================================================
        // 9. CHECK IF ORDER WAS CREATED
        // ==================================================

        if (!newOrder) {

            console.log(
                "Checkout was already processed."
            );

            return res.json({

                received: true,

                success: true,

                message:
                    "Checkout already processed."

            });

        }


        console.log(
            `✅ Order created successfully: ${newOrder._id}`
        );


        // ==================================================
        // 10. ADMIN NOTIFICATION
        // ==================================================

        try {

            await createAdminNotification({

                title:
                    "New Order Received",

                message:
                    `A new order from ${checkoutSession.firstName} ${checkoutSession.lastName} has been paid successfully.`,

                type:
                    "order",

                referenceId:
                    newOrder._id,

                referenceType:
                    "Order",

                metadata: {

                    orderId:
                        newOrder._id,

                    customerName:
                        `${checkoutSession.firstName} ${checkoutSession.lastName}`,

                    customerEmail:
                        checkoutSession.customerEmail,

                    total:
                        newOrder.total,

                    paymentStatus:
                        newOrder.paymentStatus

                }

            });

        } catch (notificationError) {

            console.error(
                "⚠️ ADMIN NOTIFICATION ERROR:",
                notificationError
            );

        }

        // ==================================================
// CUSTOMER ORDER CONFIRMATION EMAIL
// ==================================================

try {

    await sendEmail({
        to: newOrder.customerEmail,
        subject: `Order Confirmation - ${newOrder._id}`,
        html: orderConfirmation(newOrder)
    });

} catch (emailError) {

    console.error(
        "CUSTOMER ORDER CONFIRMATION EMAIL ERROR:",
        emailError
    );

}


        // ==================================================
        // 11. WEBHOOK COMPLETE
        // ==================================================

        console.log("=================================");
        console.log(
            "✅ ORDER PROCESSING COMPLETE"
        );
        console.log("=================================");


        return res.status(200).json({

            received: true,

            success: true,

            orderId:
                newOrder._id

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

        const { sessionId } = req.params;

        // ==================================================
        // 1. VALIDATE SESSION ID
        // ==================================================

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Stripe session ID is required."
            });
        }


        // ==================================================
        // 2. GET STRIPE CHECKOUT SESSION
        // ==================================================

        const session =
            await stripe.checkout.sessions.retrieve(
                sessionId
            );


        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Stripe checkout session not found."
            });
        }


        // ==================================================
        // 3. VERIFY PAYMENT STATUS
        // ==================================================

        if (session.payment_status !== "paid") {

            return res.status(400).json({
                success: false,
                paid: false,
                processing: false,
                message: "Payment has not been completed."
            });

        }


        // ==================================================
        // 4. FIND OUR CHECKOUT SESSION
        // ==================================================

        const checkoutSessionId =
            session.metadata &&
            session.metadata.checkoutSessionId;


        if (!checkoutSessionId) {

            return res.status(400).json({
                success: false,
                message:
                    "Checkout session information is missing."
            });

        }


        const checkoutSession =
            await CheckoutSession.findById(
                checkoutSessionId
            );


        if (!checkoutSession) {

            return res.status(404).json({
                success: false,
                message:
                    "Our checkout session could not be found."
            });

        }


        // ==================================================
        // 5. IF ORDER IS ALREADY LINKED
        // ==================================================

        if (checkoutSession.order) {

            const order =
                await Order.findById(
                    checkoutSession.order
                ).populate(
                    "orderItems.product"
                );


            if (order) {

                return res.status(200).json({

                    success: true,

                    paid: true,

                    processing: false,

                    order

                });

            }

        }


        // ==================================================
        // 6. FALLBACK: FIND ORDER BY STRIPE SESSION
        // ==================================================

        const order =
            await Order.findOne({

                stripeSessionId:
                    session.id

            }).populate(
                "orderItems.product"
            );


        // ==================================================
        // 7. PAYMENT SUCCESSFUL BUT WEBHOOK STILL PROCESSING
        // ==================================================

        if (!order) {

            return res.status(202).json({

                success: true,

                paid: true,

                processing: true,

                message:
                    "Payment received. Your order is being processed."

            });

        }


        // ==================================================
        // 8. PAYMENT + ORDER COMPLETED
        // ==================================================

        return res.status(200).json({

            success: true,

            paid: true,

            processing: false,

            order

        });


    } catch (error) {

        console.error(
            "VERIFY PAYMENT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to verify payment.",

            error:
                error.message

        });

    }
};

module.exports = {

    createCheckoutSession,

    verifyPayment,

    getMyOrders,

    trackOrder,

    getSingleOrder,

    cancelOrder,

    stripeWebhook

};
