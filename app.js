const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const { checkOfflineUsers } = require("./controllers/authController");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const path = require("path");
const adminRoutes = require("./routes/adminRoutes");
const adminStatisticsRoutes = require("./routes/adminStatisticsRoutes");
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "https://www.blegab.com",
      "https://api.blegab.com"
    ],
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| Stripe Webhook
|--------------------------------------------------------------------------
| IMPORTANT:
| This route must receive the raw request body.
| Do not put express.json() before it.
|--------------------------------------------------------------------------
*/

app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

app.use("/images", express.static(path.join(__dirname, "public/images")));

/*
|--------------------------------------------------------------------------
| Stripe webhook MUST be mounted before express.json()
|--------------------------------------------------------------------------
*/

app.post(
  "/api/orders/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.isStripeWebhook = true;
    next();
  },
  require("./controllers/orderController").stripeWebhook
);

/*
|--------------------------------------------------------------------------
| JSON parser for normal API requests
|--------------------------------------------------------------------------
*/

app.use(express.json());

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/statistics", adminStatisticsRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/shipping", shippingRoutes);
app.use("/api/admin/settings", settingsRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Blegab Luxury Wigs API is running...",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

setInterval(() => {
    checkOfflineUsers();
}, 30 * 1000);

module.exports = app;