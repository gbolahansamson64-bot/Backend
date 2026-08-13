const stripe = require("../config/stripe");

const Order = require("../models/Order");

const createCheckoutSession = async (
    req,
    res
) => {

    try {
        const { orderId } = req.body;

        const order = await Order.findById(
        orderId
        );
        if(!order){

         return res.status(404).json({

         message:"Order not found"

        });

        if(order.paymentStatus==="Paid"){

          return res.status(400).json({

          message:"Order already paid"

        });
        }

        const lineItems =
order.orderItems.map(item=>({

price_data:{

currency:"usd",

product_data:{

name:item.name

},

unit_amount:
Math.round(item.price*100)

},

quantity:item.quantity

}));

}

const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  line_items,
  mode: "payment",

  metadata: {
    orderId: order._id.toString(),
  },

  success_url: "http://localhost:3000/payment-success",
  cancel_url: "http://localhost:3000/payment-cancel",
});
res.json({

url:session.url

});

    } catch (error) {

        res.status(500).json({

            message:error.message

        });

    }

};

const webhook=async(req,res)=>{

try{
    const sig=req.headers["stripe-signature"];
    let event;

try{

event=stripe.webhooks.constructEvent(

req.body,

sig,

process.env.WEBHOOK_SECRET

);
const orderId = session.metadata.orderId;

const order = await Order.findById(orderId);

.populate("user");

if (!order) {
    return res.status(404).send("Order not found");
}

order.paymentStatus = "Paid";

order.orderStatus = "Processing";

order.stripeSessionId = session.id;

order.paidAt = new Date();

await order.save();

await sendEmail(

order.user.email,

"Order Confirmation",

orderConfirmation(order)

);

res.status(200).json({
    received: true
});

}
catch(error){

return res.status(400).send(

`Webhook Error: ${error.message}`

);

}
if(

event.type==="checkout.session.completed"

){
const session=

event.data.object;
}
}

catch(error){

}
};