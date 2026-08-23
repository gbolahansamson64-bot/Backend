const express = require("express");

const router = express.Router();

const {

createCheckoutSession,

webhook

}=require("../controllers/stripeController");

const {

protect

}=require("../middleware/authMiddleware");

router.post(

"/create-checkout-session",

protect,

createCheckoutSession

);

/*
Notice something.

No protect middleware.

Stripe isn't logged in as a user.

Stripe is another server.
*/

router.post(

"/webhook",

express.raw({

type:"application/json"

}),

webhook

);

module.exports=router;