const Order = require("../models/Order");
const Product = require("../models/Product");

const getDashboard = async (req, res) => {
  try {

    // ==========================
    // OVERVIEW STATS
    // ==========================

    const totalOrders = await Order.countDocuments();

    const pendingOrders = await Order.countDocuments({
      orderStatus: "Pending"
    });

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({
      createdAt: {
        $gte: today
      }
    }).select("total paymentStatus");

    const salesToday = todayOrders.reduce((sum, order) => {

      if (order.paymentStatus === "Paid") {
        return sum + order.total;
      }

      return sum;

    }, 0);

    // ==========================
    // WEEK SALES
    // ==========================

    const week = new Date();

    week.setDate(week.getDate() - 7);

    const weekOrders = await Order.find({
      createdAt: {
        $gte: week
      }
    }).select("total paymentStatus");

    const salesWeek = weekOrders.reduce((sum, order) => {

      if (order.paymentStatus === "Paid") {
        return sum + order.total;
      }

      return sum;

    }, 0);

    // ==========================
// MONTH SALES
// ==========================

const monthStart = new Date();

monthStart.setDate(1);

monthStart.setHours(0, 0, 0, 0);

const monthOrders = await Order.find({
  createdAt: {
    $gte: monthStart
  }
}).select("total paymentStatus");

const salesMonth = monthOrders.reduce((sum, order) => {

  if (order.paymentStatus === "Paid") {
    return sum + order.total;
  }

  return sum;

}, 0);

    // ==========================
// LOW STOCK
// ==========================

const lowStockProductsDB = await Product.find({
  stock: { $lte: 5 }
}).limit(5);

const lowStockProducts = lowStockProductsDB.map(product => ({

  name: product.name,

  image:
    product.images && product.images.length
      ? product.images[0]
      : "",

  meta:
    (product.length || "") +
    " • " +
    (product.laceType || "") +
    " • " +
    (product.texture || ""),

  left: product.stock

}));

// ==========================
// RECENT ORDERS
// ==========================

const recentOrdersDB = await Order.find()
.sort({ createdAt: -1 })
.limit(10);

const recentOrders = recentOrdersDB.map(order => ({

  id: order._id,

  customer: order.shippingAddress
  ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
  : "Unknown Customer",

  date: order.createdAt
  ? order.createdAt.toLocaleDateString()
  : "",

  status: (order.orderStatus || "Pending").toLowerCase(),

  total: order.total

}));

    // ==========================
    // RESPONSE
    // ==========================

    res.status(200).json({

      success: true,

      overview: {

        defaultDate: new Date().toISOString().slice(0, 10),

        stats: {

          salesToday,

          salesWeek,

          salesMonth,

          ordersTotal: totalOrders,

          ordersPending: pendingOrders

        }

      },

      lowStockProducts,

      recentOrders

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message: error.message

    });

  }
};

module.exports = {
  getDashboard
};