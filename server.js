require("dotenv").config();

const stripe = require("./config/stripe");

stripe.accounts.retrieve()
  .then(account => {
    console.log("STRIPE ACCOUNT:", account.id);
    console.log("STRIPE ACCOUNT NAME:", account.business_profile?.name);
  })
  .catch(error => {
    console.error("STRIPE ACCOUNT CHECK ERROR:", error.message);
  });


const app = require("./app");
const connectDB = require("./config/db");

const passport = require("passport");

require("./config/passport");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();