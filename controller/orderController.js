const Order = require('../model/orderScheema');
const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const Address = require('../model/addressSchema');
const Razorpay = require('razorpay');
require('dotenv').config();


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

    res.render('user/checkout', {
      cart,          // Pass the cart items
      productsMap,   // Pass the product details
      addresses,     // Pass the user's address details
      cartTotal,     // Pass the cart total
      user_id        // Pass the user ID for reference
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};
// const placeOrder = async (req, res) => {
//   try {
//     const user_id = req.session.user_id;
//     const { paymentMethod, addressId, zipcode, streetAddress } = req.body;

//     // Fetch cart items for the user
//     const cartItems = await Cart.find({ user_id: user_id });
//     if (!cartItems || cartItems.length === 0) {
//       return res.status(400).send("Cart is empty");
//     }

//     let totalAmount = 0;
//     const orderItems = [];

//     // Loop through the cart items
//     for (const cartItem of cartItems) {
//       const product = await Product.findById(cartItem.product_id);
//       if (!product || product.quantity < cartItem.quantity) {
//         return res.status(400).send("Product is out of stock");
//       }

//       // Calculate the total amount
//       totalAmount += product.salesPrice * cartItem.quantity;

//       // Create a new order for each product
//       const order = new Order({
//         user_id: user_id,
//         product_id: cartItem.product_id,
//         quantity: cartItem.quantity,
//         paymentMethod: paymentMethod, // COD or Online
//         address_id: addressId,
//         zipcode: zipcode,
//         streetAddress: streetAddress,
//         price: product.salesPrice * cartItem.quantity,
//         status: "Pending", // Default status set as Pending
//       });

//       // Save the order
//       await order.save();

//       // Decrease product stock quantity
//       product.quantity -= cartItem.quantity;
//       await product.save();

//       orderItems.push(order);
//     }

//     // Empty the user's cart after placing the order
//     await Cart.deleteMany({ user_id: user_id });

//     // Send success response
//     res.json({
//       success: true,
//       message: "Order placed successfully",
//       orderItems,
//       totalAmount,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send("Internal Server Error");
//   }
// };

const cashOnDelivery = async(req,res)=>{
  try {
    console.log('hello there..')
      const user_id = req.session.user_id;
      const formData = req.body.formData;
      const totalPrice = req.body.totalPrice;
      console.log(formData)
      const { address, payment_option } = formData;
      const addressData = await Address.findById({ _id:address })
      const cartItem = await Cart.find({ user_id : user_id })
      const product = cartItem.map((item)=>({
          productId : item.product_id,
          quantity : item.quantity,
          price : item.totalPrice

      }))
     
      
  
      console.log(product)
      if (totalPrice >= 1000) {
        return res.status(400).json({
            success: false,
            message: "Cash On Delivery is only available for orders under 1000 rupees.",
        });
    }
   
   

      const order = new Order({
          user : user_id,
          address:{
              city:addressData.city,
              zipcode:addressData.zipcode,
              streetAddress : addressData.streetAddress
          },
          products : product.map((product)=>({
              productId : product.productId,
              quantity : product.quantity,
              price : product.price,
          })),
          status : "Pending",
          payment : payment_option,
          totalPrice : totalPrice,  
      })
console.log(order)
      
if (order) {
  await order.save();

  for (const product of order.products) {
      const productId = product.productId;
      const orderedQuantity = product.quantity;

      // Find and update the product quantity
      const productData = await Product.findById(productId);
      if (!productData) {
          // Handle the case where the product is not found
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
      message: "Order placed successfully and cart cleared."
  });
}
  
    


  } catch (error) {
      console.log(error.message);
  }
}

const orderSuccessfull = async(req,res)=>{
  try {
      res.render("user/orderCompleted")
  } catch (error) {
      console.log(error.message);
  }
}
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status === 'Canceled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already canceled',
      });
    }

    // Update the status to Canceled
    order.status = 'Canceled';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order canceled successfully',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'An error occurred while canceling the order',
    });
  }
};
const loadAdminOrderManagement = async(req,res)=>{
  try {
    const order = await Order.find({}).populate("user")
    console.log('this is my name',order)
    res.render("admin/orderManagement",{
      order
    })
  } catch (error) {
    console.log(error.message);
  } 
}

const loadAdminOrderView = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log(orderId);  // Debugging log to check the order ID

    const orderData = await Order.findById(orderId)
      .populate("user")
      .populate("products.productId");
    
    console.log(orderData,"iam a order data");  // Debugging log to check the retrieved order data

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
      price: item.totalPrice
    }));

    const order = new Order({
      user : user_id,
      address:{
          city:addressData.city,
          zipcode:addressData.zipcode,
          streetAddress : addressData.streetAddress
      },
      products : product.map((product)=>({
          productId : product.productId,
          quantity : product.quantity,
          price : product.price,
      })),
      status : "Pending",
      payment : payment_option,
      totalPrice : totalPrice,  
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
  
module.exports={loadeCheckout,
cashOnDelivery,
orderSuccessfull,
cancelOrder,
loadAdminOrderManagement,
loadAdminOrderView,
updateOrderStatus,
razorPayPayment,
razorpaySuccessfullOrder
}