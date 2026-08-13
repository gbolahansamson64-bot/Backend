const Order = require("../models/Order");

const getStatistics = async (req, res) => {
  try {

    const now = new Date();

    // =========================
    // TODAY
    // =========================

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // =========================
    // WEEK
    // =========================

    const startOfWeek = new Date(startOfToday);

    startOfWeek.setDate(
      startOfWeek.getDate() - startOfWeek.getDay()
    );

    // =========================
    // MONTH
    // =========================

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    // =========================
    // YEAR
    // =========================

    const startOfYear = new Date(
      now.getFullYear(),
      0,
      1
    );

    // =========================
    // PAID ORDERS ONLY
    // =========================

    const paidOrders = await Order.find({
  paymentStatus: "Paid"
})
.sort({ createdAt: -1 })
.populate({
  path: "orderItems.product",
  populate: {
    path: "category",
    select: "name"
  }
});

    // =========================
    // TOTALS
    // =========================

    let today = 0;
    let week = 0;
    let month = 0;
    let year = 0;

    paidOrders.forEach(order => {

      const date = new Date(order.createdAt);

      if (date >= startOfToday) {
        today += order.total;
      }

      if (date >= startOfWeek) {
        week += order.total;
      }

      if (date >= startOfMonth) {
        month += order.total;
      }

      if (date >= startOfYear) {
        year += order.total;
      }

    });

    const transactions = paidOrders.map(order => {

  let description = "";

  if (order.orderItems.length === 1) {

    description = order.orderItems[0].name;

  } else {

    const names = order.orderItems.map(item => item.name);

    if (names.length <= 2) {

      description = names.join(", ");

    } else {

      description =
        names.slice(0, 2).join(", ") +
        " +" +
        (names.length - 2) +
        " more";

    }

  }

  return {

    reference: order._id,

    description,

    date: order.createdAt,

    amount: order.total,

    status: order.paymentStatus.toLowerCase()

  };

});

const chart = {

    daily: {
        labels: [],
        values: []
    },

    weekly: {
        labels: [],
        values: []
    },

    monthly: {
        labels: [],
        values: []
    }

};

paidOrders.forEach(order => {

    const day = new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });

    const index = chart.daily.labels.indexOf(day);

    if (index === -1) {

        chart.daily.labels.push(day);
        chart.daily.values.push(order.total);

    } else {

        chart.daily.values[index] += order.total;

    }

});

const weeklyTotals = {};

paidOrders.forEach(order => {

    const date = new Date(order.createdAt);

    const year = date.getFullYear();

    const firstDay = new Date(year, 0, 1);

    const days = Math.floor(
        (date - firstDay) / (1000 * 60 * 60 * 24)
    );

    const week = Math.ceil((days + firstDay.getDay() + 1) / 7);

    const label = "Week " + week;

    if (!weeklyTotals[label]) {
        weeklyTotals[label] = 0;
    }

    weeklyTotals[label] += order.total;

});

chart.weekly.labels = Object.keys(weeklyTotals);

chart.weekly.values = Object.values(weeklyTotals);

const monthlyTotals = {};

paidOrders.forEach(order => {

    const label = new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
    });

    if (!monthlyTotals[label]) {
        monthlyTotals[label] = 0;
    }

    monthlyTotals[label] += order.total;

});

chart.monthly.labels = Object.keys(monthlyTotals);

chart.monthly.values = Object.values(monthlyTotals);

const categoryTotals = {};

paidOrders.forEach(order => {

    order.orderItems.forEach(item => {

        const category =
          item.product?.category?.name || "Other";

        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }

        categoryTotals[category] += item.price * item.quantity;

    });

});

const chartColors = [
    "#D4AF37",
    "#8B5CF6",
    "#10B981",
    "#F97316",
    "#3B82F6",
    "#EF4444",
    "#EC4899",
    "#14B8A6"
];

const breakdown = Object.keys(categoryTotals).map(function(category, index){

    return {

        label: category,

        value: categoryTotals[category],

        color: chartColors[index % chartColors.length]

    };

});

res.status(200).json({

  success: true,

  earnings: {

    today: {
        value: today,
        deltaPct: 0,
        direction: "up"
    },

    week: {
        value: week,
        deltaPct: 0,
        direction: "up"
    },

    month: {
        value: month,
        deltaPct: 0,
        direction: "up"
    },

    year: {
        value: year,
        deltaPct: 0,
        direction: "up"
    }

},

  chart,

  breakdown,

  transactions

});

  } catch (error) {

    res.status(500).json({

      success: false,

      message: error.message

    });

  }
};

module.exports = {
  getStatistics
};
