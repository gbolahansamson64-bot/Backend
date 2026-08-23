const Order = require("../models/Order");
const Product = require("../models/Product");

const getDashboard = async (req, res) => {

    try {

        // ==================================================
        // DATE RANGES
        // ==================================================

        const now = new Date();

        // ------------------------------------------
        // TODAY
        // ------------------------------------------

        const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        const startOfTomorrow = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
        );


        // ------------------------------------------
        // START OF CURRENT WEEK
        // Sunday = 0
        // ------------------------------------------

        const dayOfWeek = now.getDay();

        const startOfWeek = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - dayOfWeek
        );

        startOfWeek.setHours(0, 0, 0, 0);


        // ------------------------------------------
        // START OF CURRENT MONTH
        // ------------------------------------------

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        startOfMonth.setHours(0, 0, 0, 0);


        // ==================================================
        // OVERVIEW STATS
        // ==================================================

        const totalOrders =
            await Order.countDocuments();


        const pendingOrders =
            await Order.countDocuments({
                orderStatus: "Pending"
            });


        // ==================================================
        // TODAY'S ORDERS
        // ==================================================

        const todayOrders =
            await Order.countDocuments({

                createdAt: {
                    $gte: startOfToday,
                    $lt: startOfTomorrow
                },

                paymentStatus: "Paid"

            });


        // ==================================================
        // TODAY'S SALES
        // ==================================================

        const todaySalesResult =
            await Order.aggregate([

                {
                    $match: {

                        createdAt: {
                            $gte: startOfToday,
                            $lt: startOfTomorrow
                        },

                        paymentStatus: "Paid",

                        orderStatus: {
                            $ne: "Cancelled"
                        }

                    }
                },

                {
                    $group: {

                        _id: null,

                        total: {
                            $sum: "$total"
                        }

                    }
                }

            ]);


        const salesToday =
            todaySalesResult.length
                ? todaySalesResult[0].total
                : 0;


        // ==================================================
        // WEEK SALES
        // ==================================================

        const weekSalesResult =
            await Order.aggregate([

                {
                    $match: {

                        createdAt: {
                            $gte: startOfWeek
                        },

                        paymentStatus: "Paid",

                        orderStatus: {
                            $ne: "Cancelled"
                        }

                    }
                },

                {
                    $group: {

                        _id: null,

                        total: {
                            $sum: "$total"
                        }

                    }
                }

            ]);


        const salesWeek =
            weekSalesResult.length
                ? weekSalesResult[0].total
                : 0;


        // ==================================================
        // MONTH SALES
        // ==================================================

        const monthSalesResult =
            await Order.aggregate([

                {
                    $match: {

                        createdAt: {
                            $gte: startOfMonth
                        },

                        paymentStatus: "Paid",

                        orderStatus: {
                            $ne: "Cancelled"
                        }

                    }
                },

                {
                    $group: {

                        _id: null,

                        total: {
                            $sum: "$total"
                        }

                    }
                }

            ]);


        const salesMonth =
            monthSalesResult.length
                ? monthSalesResult[0].total
                : 0;


        // ==================================================
        // LOW STOCK PRODUCTS
        // ==================================================

        const lowStockProductsDB =
            await Product.find({

                isActive: true,

                stock: {
                    $lte: 5
                }

            })
            .sort({
                stock: 1
            })
            .limit(5);


        const lowStockProducts =
            lowStockProductsDB.map(product => ({

                id:
                    product._id,

                name:
                    product.name,

                image:
                    product.images &&
                    product.images.length
                        ? product.images[0]
                        : "",

                meta:
                    [
                        product.length,
                        product.laceType,
                        product.capSize
                    ]
                    .filter(Boolean)
                    .join(" • "),

                left:
                    product.stock

            }));


        // ==================================================
        // RECENT ORDERS
        // ==================================================

        const recentOrdersDB =
            await Order.find()

                .populate(
                    "user",
                    "firstName lastName email"
                )

                .sort({
                    createdAt: -1
                })

                .limit(10);


        const recentOrders =
            recentOrdersDB.map(order => ({

                id:
                    order._id,

                customer:
                    order.shippingAddress

                        ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`

                        : "Unknown Customer",

                date:
                    order.createdAt
                        ? order.createdAt.toLocaleDateString()
                        : "",

                status:
                    (
                        order.orderStatus ||
                        "Pending"
                    ).toLowerCase(),

                total:
                    order.total

            }));


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(200).json({

            success: true,

            overview: {

                defaultDate:
                    now.toISOString().slice(0, 10),

                stats: {

                    salesToday,

                    salesWeek,

                    salesMonth,

                    ordersTotal:
                        totalOrders,

                    ordersPending:
                        pendingOrders,

                    ordersToday:
                        todayOrders

                }

            },

            lowStockProducts,

            recentOrders

        });


    } catch (error) {

        console.error(
            "GET DASHBOARD ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load dashboard data."

        });

    }

};


module.exports = {
    getDashboard
};