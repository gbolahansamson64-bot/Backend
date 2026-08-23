const orderConfirmation = (order) => {
    const itemsHtml = order.orderItems
        .map(item => `
            <tr>
                <td style="padding:10px 0;">
                    ${item.name}
                </td>
                <td style="padding:10px 0; text-align:center;">
                    ${item.quantity}
                </td>
                <td style="padding:10px 0; text-align:right;">
                    $${item.price.toFixed(2)}
                </td>
            </tr>
        `)
        .join("");

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Order Confirmation</title>
</head>

<body style="font-family:Arial,sans-serif;line-height:1.6;">

    <h2>Order Confirmed</h2>

    <p>
        Thank you for your order.
        Your payment was successful and your order has been received.
    </p>

    <p>
        <strong>Order ID:</strong>
        ${order._id}
    </p>

    <p>
        <strong>Order Status:</strong>
        ${order.orderStatus}
    </p>

    <h3>Order Items</h3>

    <table width="100%" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th align="left">Product</th>
                <th align="center">Qty</th>
                <th align="right">Price</th>
            </tr>
        </thead>

        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <hr>

    <p>
        <strong>Subtotal:</strong>
        $${order.subtotal.toFixed(2)}
    </p>

    <p>
        <strong>Shipping:</strong>
        $${order.shippingFee.toFixed(2)}
    </p>

    <p>
        <strong>Total:</strong>
        $${order.total.toFixed(2)}
    </p>

    <h3>Shipping Information</h3>

    <p>
        ${order.shippingAddress.firstName}
        ${order.shippingAddress.lastName}<br>

        ${order.shippingAddress.address}<br>

        ${order.shippingAddress.city},
        ${order.shippingAddress.state}<br>

        ${order.shippingAddress.country}<br>

        ${order.shippingAddress.postalCode}<br>

        ${order.shippingAddress.phone}
    </p>

    <p>
        You can track your order using your order ID and email address.
    </p>

</body>
</html>
`;
};

module.exports = orderConfirmation;