const mongoose = require('mongoose');
const Order = require('../model/orderScheema');
const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const Address = require('../model/addressSchema');
const Razorpay = require('razorpay');
const Wallet = require('../model/walletScheema')
const Coupon = require('../model/couponModel');
const User=require('../model/userSchema')
const easyinvoice = require("easyinvoice");
const { Readable } = require("stream");
require('dotenv').config();


// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const RazorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadeCheckout = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cart = await Cart.find({ user_id: user_id });
    const productIds = cart.map((cartItem) => cartItem.product_id);
    const products = await Product.find({ _id: { $in: productIds } });
    const addresses = await Address.find({ user_id: user_id });
    const coupons = await Coupon.find({});
    console.log(coupons, "Fetched coupons");

    // Map product data to cart items
    const productsMap = products.reduce((acc, product) => {
      acc[product._id] = product;
      return acc;
    }, {});

    // Calculate cart total
    let cartTotal = 0;
    cart.forEach((cartItem) => {
      const product = productsMap[cartItem.product_id];
      if (product) {
        cartTotal += product.salesPrice * cartItem.quantity;
      }
    });

    // Pass all necessary data to the template
    res.render('user/checkout', {
      cart,
      productsMap,
      addresses,
      cartTotal,
      user_id,
      coupons  // Passing coupons array
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const cashOnDelivery = async (req, res) => {
  try {
    console.log('hello there..');
    const user_id = req.session.user_id;
    const formData = req.body.formData;
    const totalPrice = req.body.totalPrice;  // This should already represent the sum of all product prices in the cart

    console.log(formData);
    const { address, payment_option } = formData;

    const addressData = await Address.findById({ _id: address });
    const cartItems = await Cart.find({ user_id: user_id });

    // Map through the cart items and calculate the price for each product individually
    const products = await Promise.all(cartItems.map(async (item) => {
      const productData = await Product.findById(item.product_id);
      if (!productData) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }
    
      if (!item.size) {
        throw new Error(`Size is missing for product with ID ${item.product_id}`);
      }

      return {
        productId: item.product_id,
        quantity: item.quantity,
        price: productData.salesPrice * item.quantity,
        size: item.size  // Ensure size is included here
      };
    }));
    console.log('Products with size:', products);

    
    
    

    console.log(products);

    if (totalPrice >= 1000) {
      return res.status(400).json({
        success: false,
        message: "Cash On Delivery is only available for orders under 1000 rupees.",
      });
    }

    // Create the order with the calculated product prices
    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
      products: products.map(product => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,  // Use the corrected price
        size:product.size
      })),
      status: "Pending",
      payment: payment_option,
      totalPrice: totalPrice,  // This should already be the sum of all products' prices
    });

    console.log(order,"order");

    if (order) {
      await order.save();

      for (const product of order.products) {
        const productId = product.productId;
        const orderedQuantity = product.quantity;

        // Find and update the product quantity
        const productData = await Product.findById(productId);
        if (!productData) {
          return res.status(404).json({
            success: false,
            message: `Product with ID ${productId} not found.`,
          });
        }

        const updateQuantity = productData.quantity - orderedQuantity;

        await Product.findByIdAndUpdate(productId, { quantity: updateQuantity });
      }

      // Clear the cart for the user
      await Cart.deleteMany({ user_id: user_id });

      // Send success response
      res.status(200).json({
        success: true,
        message: "Order placed successfully and cart cleared.",
      });
    }

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const orderSuccessfull = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cart = await Cart.find({ user_id: user_id });

    // Find the most recent order by the user
    const order = await Order.findOne({ user: user_id }).sort({ createdOn: -1 });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Pass order details to the template
    res.render("user/orderCompleted", {
      title: "Cart",
      cart,
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,  // Add totalPrice here
      products: order.products,  // Array of products in the order
      createdOn: order.createdOn
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { reason } = req.body; // Get the cancellation reason from the request body
    const order = await Order.findById(orderId).populate('products.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already canceled',
      });
    }

    // Update the order status and add the cancellation reason
    order.status = 'Cancelled';
    order.failureReason = reason || 'No reason provided'; // Save the reason
    await order.save();

    // Find or create the user's wallet
    let wallet = await Wallet.findOne({ userId: order.user });

    if (!wallet) {
      wallet = new Wallet({ userId: order.user });
    }

    // Add the canceled amount to the wallet balance
    wallet.balance += order.totalPrice;

    // Add a transaction record
    wallet.transactions.push({
      amount: order.totalPrice,
      transactionType: 'credit',
      date: new Date(),
    });

    await wallet.save();

    // Increment the stock for each product in the order
    for (const productItem of order.products) {
      const product = productItem.productId;
      if (product) {
        product.quantity += productItem.quantity; // Increment stock
        await product.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Order canceled successfully, stock updated, and amount credited to wallet.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'An error occurred while canceling the order',
    });
  }
};



const loadAdminOrderManagement = async (req, res) => {
  try {
    // Get page number from query parameters, default to 1
    const page = parseInt(req.query.page) || 1;
    // Set pageSize to 5
    const pageSize = 8;
    // Calculate the number of documents to skip
    const skip = (page - 1) * pageSize;

    // Fetch orders with pagination
    const orders = await Order.find({})
      .populate("user")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(pageSize);

    // Get the total number of orders for pagination controls
    const totalOrders = await Order.countDocuments({});
    const totalPages = Math.ceil(totalOrders / pageSize);

    res.render("admin/orderManagement", {
      orders,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.log(error.message);
  }
};




const loadAdminOrderView = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log(orderId);  // Debugging log to check the order ID

    const orderData = await Order.findById(orderId)
      .populate("user")
      .populate("products.productId");

    console.log(orderData, "iam a order data");  // Debugging log to check the retrieved order data

    if (!orderData) {
      return res.render("admin/adminOrderView", {
        order: null,
        message: "Order not found"
      });
    }

    res.render("admin/adminOrderView", {
      order: orderData
    });
  } catch (error) {
    console.log(error.message);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;

    // Find the order by ID and update its status
    const order = await Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Redirect back to the order details page (or another page)
    res.redirect(`/admin/orderManagement`);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};


const razorPayPayment = async (req, res) => {
  try {
    console.log("hi iam coming in this ")
    const formData = req.body.formData;
    const totalPrice = req.body.totalPrice * 100; // Razorpay requires amount in paise

    const options = {
      amount: totalPrice,
      currency: "INR",
      receipt: "order_rcptid_" + new Date().getTime(),
    };

    RazorpayInstance.orders.create(options, (err, order) => {
      if (!err) {
        res.status(200).send({
          success: true,
          message: "Order created successfully",
          order_id: order.id,
          amount: totalPrice, // Already in paise
          key_id: process.env.RAZORPAY_KEY_ID,
          productName: req.body.name,
          name: "Suhail",  // Replace with your name
          email: "suhailrk910@gmail.com",  // Replace with your email if needed
          formData,
          currency: options.currency // Add currency to the response
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Error creating Razorpay order",
        });
      }
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const razorpaySuccessfullOrder = async (req, res) => {
  try {
    console.log('hi this is order completer')
    const user_id = req.session.user_id;
    const { address, payment_option } = req.body.formData;
    // const payment = req.body.payment_option;
    const totalPrice = req.body.totalPrice;
    const cartItems = await Cart.find({ user_id: user_id });
    const addressData = await Address.findById({ _id: address });

    const product = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
      size: item.size
    }));

    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress
      },
      products: product.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,
        size:product.size
      })),
      status: "Pending",
      payment: payment_option,
      totalPrice: totalPrice,
    })
    console.log(order)

    if (order) {
      await order.save();
      for (const product of order.products) {
        const productId = product.productId;
        const orderQuantity = product.quantity;
        const productData = await Product.findById(productId);
        if (!productData) {
          return res.status(404).json({ success: false, message: "Product not found" });
        }
        const UpdatedQuantity = productData.quantity - orderQuantity;
        await Product.findByIdAndUpdate(productId, { quantity: UpdatedQuantity });
      }
      await Cart.deleteMany({ user_id: user_id });
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const razorPayFailedOrder = async (req, res) => {
  try {
    console.log('Saving failed order...');
    const user_id = req.session.user_id;
    const { address, payment_option } = req.body.formData;
    const failureReason = req.body.failureReason || "Unknown reason";
    const totalPrice = req.body.totalPrice;
    const cartItems = await Cart.find({ user_id: user_id });
    const addressData = await Address.findById({ _id: address });

    const product = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
      size: item.size,
    }));

    const order = new Order({
      user: user_id,
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
      products: product.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        price: product.price,
        size: product.size,
      })),
      status: "Failed",
      payment: "Razorpay",
      totalPrice: totalPrice,
    });

    order.failureReason = failureReason; // Save the failure reason in the order
    console.log("Failed Order:", order);

    if (order) {
      await order.save();
      res.status(200).json({ success: true, message: "Order saved with Failed status." });
    }
  } catch (error) {
    console.error("Error saving failed order:", error.message);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch the failed order details
    const failedOrder = await Order.findById(orderId);

    if (!failedOrder || failedOrder.status !== "Failed") {
      return res.status(400).json({
        success: false,
        message: "Invalid or non-failed order. Cannot retry payment.",
      });
    }

    const totalPriceInPaise = failedOrder.totalPrice * 100; // Razorpay requires amount in paise

    // Create a new Razorpay order
    const options = {
      amount: totalPriceInPaise,
      currency: "INR",
      receipt: `retry_${failedOrder._id.toString().slice(-10)}`, // Ensure receipt is <= 40 chars
    };

    RazorpayInstance.orders.create(options, async (err, newRazorpayOrder) => {
      if (err) {
        console.error("Error creating Razorpay order:", err);
        return res.status(500).json({
          success: false,
          message: "Error creating Razorpay order for retry.",
        });
      }

      // Send the new order ID back to the frontend
      res.status(200).json({
        success: true,
        message: "Retry payment order created successfully",
        razorpayOrderId: newRazorpayOrder.id,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: totalPriceInPaise,
        currency: "INR",
        orderId: failedOrder._id, // Pass back original failed order ID
      });
    });
  } catch (error) {
    console.error("Error in retry payment:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error during retry payment",
    });
  }
};


const paymentSuccessHandler = async (req, res) => {
  try {
    const { orderId } = req.params; // Original failed order ID
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Update order status to 'Completed'
    order.status = "Completed";
    order.paymentDetails = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signature: razorpay_signature,
    };

    await order.save();

    // Clear the cart for the user
    await Cart.deleteMany({ user_id: order.user });

    res.status(200).json({ success: true, message: "Order payment completed successfully and cart cleared." });
  } catch (error) {
    console.error("Error handling payment success:", error.message);
    res.status(500).json({ success: false, message: "Internal server error during payment success handling" });
  }
};




// // Function to retry payment
// const retryRazorpayPayment = async (order) => {
//   try {
//     // Amount is expected to be in paise (multiply by 100 for INR)
//     const totalPriceInPaise = order.totalPrice * 100;

//     // Options for creating the order on Razorpay
//     const options = {
//       amount: totalPriceInPaise,
//       currency: "INR",
//       receipt: "order_rcptid_" + new Date().getTime(),
//     };

//     // Create Razorpay order
//     const paymentOrder = await RazorpayInstance.orders.create(options);

//     if (!paymentOrder) {
//       return { success: false, message: "Failed to create payment order with Razorpay." };
//     }

//     // If the payment order is successful, return the response
//     return { success: true, paymentOrderId: paymentOrder.id };
//   } catch (error) {
//     console.error("Error retrying Razorpay payment:", error);
//     return { success: false, message: "An error occurred while retrying the payment." };
//   }
// };

// const retryPayments = async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     // Find the order by ID
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     // Check if the order status is "Failed"
//     if (order.status !== 'Failed') {
//       return res.status(400).json({ success: false, message: "Cannot retry payment for this order." });
//     }

//     // Retry payment logic
//     const paymentResponse = await retryRazorpayPayment(order); // Call the function we defined above

//     if (paymentResponse.success) {
//       // If payment was successfully retried, update the order status to "Completed"
//       order.status = 'Completed';
//       await order.save();
//       return res.json({ success: true, paymentOrderId: paymentResponse.paymentOrderId });
//     } else {
//       return res.status(400).json({ success: false, message: paymentResponse.message });
//     }
//   } catch (error) {
//     console.error('Retry Payment Error:', error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };




const walletPayment = async (req, res) => {
  try {
    console.log('In wallet payment');
    const userId = req.session.user_id;
    const cartItems = await Cart.find({ user_id:userId });
    console.log("USERID", userId);
    const products = cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      price: item.totalPrice,
      size: item.size
    }));
    const { totalPrice, addressId, paymentMethod } = req.body;
    console.log('REQBODY', req.body);

    // Validate request body
    if (!paymentMethod || !addressId || !totalPrice || !Array.isArray(products) || products.length === 0) {
      console.error("Validation failed:", { paymentMethod, addressId, totalPrice, products });
      return res.status(400).json({ success: false, message: "Incomplete order details or invalid products array." });
    }

    // Validate products and productId
    for (const product of products) {
      if (!mongoose.Types.ObjectId.isValid(product.productId) ||
        typeof product.quantity !== 'number' ||
        typeof product.price !== 'number') {
        console.error("Invalid product details:", product);
        return res.status(400).json({ success: false, message: "Invalid product details." });
      }
    }

    // Validate address
    const addressData = await Address.findById(addressId);
    if (!addressData) {
      console.error("Address not found:", addressId);
      return res.status(400).json({ success: false, message: "Address not found." });
    }

    // Validate wallet balance
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet || wallet.balance < totalPrice) {
      console.error("Insufficient wallet balance:", wallet.balance, totalPrice);
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }

    // Deduct from wallet balance and create a transaction
    wallet.balance -= totalPrice;
    wallet.transactions.push({
      amount: totalPrice,
      transactionType: "debit",
      date: new Date(),
    });
    await wallet.save();

    // Create the order
    const newOrder = new Order({
      user: userId,
      payment: paymentMethod,
      totalPrice: totalPrice,
      products: products,
      status: "Pending",
      address: {
        city: addressData.city,
        zipcode: addressData.zipcode,
        streetAddress: addressData.streetAddress,
      },
    });
    await newOrder.save();

    // Clear the user's cart
    await Cart.deleteMany({ user_id: userId });

    res.json({ success: true, message: "Order placed successfully." });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Server error occurred." });
  }
};


const returnOrder = async (req, res) => {
  const orderId = req.params.orderId;
  const { reason } = req.body;  // Get the return reason from the request body

  try {
    const order = await Order.findById(orderId);

    if (order.status === 'Completed') {
      // Update the order status to 'Returned' and save the return reason
      order.status = 'Returned';
      order.returnReason = reason;  // Save the return reason in the order
      await order.save();

      // Find or create the user's wallet
      let wallet = await Wallet.findOne({ userId: order.user });

      if (!wallet) {
        wallet = new Wallet({ userId: order.user });
      }

      // Add the return amount to the wallet balance
      wallet.balance += order.totalPrice;

      // Add a transaction record
      wallet.transactions.push({
        amount: order.totalPrice,
        transactionType: 'credit',
        date: new Date(),
      });

      await wallet.save();

      res.json({ success: true, message: 'Order returned and amount credited to wallet.' });
    } else {
      res.json({ success: false, message: 'Order cannot be returned.' });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'An error occurred while processing the return.' });
  }
};

const getInvoice = async (req, res) => {
  try {
    const orderId = req.query.id;
    // const userId = req.session.userId;
    const userId = req.session.user_id;

    console.log("Order ID:", orderId);
    console.log("User ID from session:", userId);

    if (!userId) {
      return res.status(401).send("User not logged in.");
    }

    // Fetch user data
    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(404).send("User not found in the database.");
    }

    // Fetch order data
    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate("address")
      .populate({ path: "products.productId" });

    if (!order) {
      return res.status(404).send("Order not found for the given user.");
    }

    res.render("user/invoicePage", { user: userData, order });
  } catch (error) {
    console.error("Error fetching invoice data:", error.message);
    res.status(500).send("Internal Server Error");
  }
};


const downloadInvoice = async (req, res) => {
  try {
      const orderId = req.query.id;
      const userId = req.session.user_id;

      if (!userId) {
          return res.status(401).send("User not logged in.");
      }

      const order = await Order.findById(orderId)
          .populate({ path: "products.productId", model: "Product" })
          .populate("address");

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found!" });
      }

      const user = await User.findById(userId);

      const invoiceData = {
        id: orderId,
        total: order.products.reduce(
            (acc, product) => acc + product.price * product.quantity,
            0
        ),
        date: order.createdOn.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
        paymentMethod: order.payment,
        orderStatus: order.status,
        name: `${order.address.firstName || "N/A"} ${order.address.lastName || ""}`,
        number: order.address.mobile || "N/A",
        house: order.address.streetAddress,
        pincode: order.address.zipcode,
        town: order.address.city,
        state: order.address.state || "N/A",
        products: order.products.map((product) => ({
            description: `${product.productId.productName || "Unknown Product"} (Size: ${product.size || "N/A"})`,
            quantity: product.quantity,
            price: product.price,
            total: product.price * product.quantity,
            "tax-rate": 0,
        })),
        sender: {
            company: "Shope...y",
            address: "Malappuram Highway",
            city: "Malappuram",
            country: "India",
        },
        client: {
            company: user.name || "N/A",
            zip: order.address.zipcode,
            city: order.address.city,
            address: order.address.streetAddress,
        },
        information: {
            number: `order${order._id}`,
            date: order.createdOn.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
        },
        "bottom-notice": "Happy Shopping and Visit Again!",
    };
    

      console.log("Invoice Data being sent:", JSON.stringify(invoiceData, null, 2));

      let pdfResult;
      try {
          pdfResult = await easyinvoice.createInvoice(invoiceData);
      } catch (error) {
          console.error("Error generating PDF with easyinvoice:", error);
          return res.status(500).json({ message: "Failed to generate invoice PDF." });
      }

      const pdfBuffer = Buffer.from(pdfResult.pdf, "base64");

      res.setHeader(
          "Content-Disposition",
          `attachment; filename="invoice_${orderId}.pdf"`
      );
      res.setHeader("Content-Type", "application/pdf");

      const pdfStream = new Readable();
      pdfStream.push(pdfBuffer);
      pdfStream.push(null);

      pdfStream.pipe(res);
  } catch (error) {
      console.error("Error in downloadInvoice:", error.message);
      res.status(500).send("Internal Server Error");
  }
};





module.exports = {
  loadeCheckout,
  cashOnDelivery,
  orderSuccessfull,
  cancelOrder,
  loadAdminOrderManagement,
  loadAdminOrderView,
  updateOrderStatus,
  razorPayPayment,
  razorPayFailedOrder,
  retryPayment,
  paymentSuccessHandler,
  // retryPayments,
  razorpaySuccessfullOrder,
  returnOrder,
  walletPayment,
  getInvoice,
  downloadInvoice
}