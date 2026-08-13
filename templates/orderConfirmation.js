const orderConfirmation=(

order

)=>{

return`

<h2>

Order Confirmed

</h2>

<p>

Order ID

${order._id}

</p>

<p>

Total

$${order.totalPrice}

</p>

`;

};

module.exports=

orderConfirmation;