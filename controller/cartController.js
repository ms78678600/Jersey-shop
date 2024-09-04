const Cart = require("../model/cartModel");
const Product = require("../model/productModel");



const loadCart = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cart = user_id
      ? await Cart.find({ user_id: user_id })
      : await Cart.find({ user_id: null });

    if (!cart.length) {
      return res.render("user/cart", {
        title: "Cart",
        cart: [],
        productsMap: {},
        cartTotal: 0,
      });
    }

    const product_ids = cart.map((cartItem) => cartItem.product_id);
    const products = await Product.find({ _id: { $in: product_ids } });

    // Map products to their corresponding cart items
    const productsMap = products.reduce((acc, product) => {
      acc[product._id] = product;
      return acc;
    }, {});

    let cartTotal = 0;
    cart.forEach((cartItem) => {
      const product = productsMap[cartItem.product_id];
      if (product) {
        cartTotal += product.salesPrice * cartItem.quantity;
      }
    });

    res.render("user/cart", {
      title: "Cart",
      cart,
      productsMap,  // Pass productsMap to the template
      cartTotal,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const addToCart = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    console.log("Product ID:", productId);
    console.log("Quantity:", qty);

    if (!productId || !qty) {
      return res.status(400).json({ message: "Product ID and quantity are required" });
    }

    const user_id = req.session.user_id;
    console.log('userid', user_id)
    const productData = await Product.findById(productId);

    console.log("Product Data:", productData);

    if (!productData) {
      return res.status(404).json({ message: "Product not found" });
    }

    const productPrice = productData.salesPrice;

    console.log("Product Price:", productPrice);
    // const category_id = productData.category._id;

    // console.log("Category ID:", category_id);

    let cartData = await Cart.findOne({
      user_id: user_id || null,
      product_id: productId,
    });

    const totalCartQuantity = cartData ? cartData.quantity : 0;
    console.log('totalcartquantity', totalCartQuantity)
    const totalQuantity = Number(totalCartQuantity) + Number(qty);
    console.log('totalquantity', totalQuantity)
    console.log('availble stock', productData.quantity)

    if (productData.quantity < qty) {
      return res.json({
        success: false,
        message: "Out Of Stock...",
      });
    }

    if (cartData) {
      // If the product is already in the cart, update the quantity
      cartData = await Cart.findOneAndUpdate(
        { user_id: user_id, product_id: productId },
        { $inc: { quantity: Number(qty) } },
        { new: true }
      );
    } else {
      // If the product is not in the cart, add it
      const cart = new Cart({
        product_id: productId,
        quantity: totalQuantity,
        productPrice,
        user_id,
        // category_id,
      });
      await cart.save();
    }

    // Update product stock
    productData.quantity -= Number(qty);
    await productData.save();

    res.json({ success: true, message: "Product Added Successfully", newStock: productData.quantity });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


const removeFromCart = async (req, res) => {
  try {
    const { cartId } = req.body;
    const user_id = req.session.user_id;

    // Find the cart item by its ID and user ID
    const cartItem = await Cart.findOne({ _id: cartId, user_id: user_id });

    // Check if the cart item exists
    if (!cartItem) {
      return res.json({ success: false, message: "Product not found in cart" });
    }

    // Find the associated product by its ID
    const product = await Product.findById(cartItem.product_id);

    // Update the product's stock by adding the cart item's quantity back to it
    product.quantity += cartItem.quantity;
    await product.save();

    // Delete the cart item
    const result = await Cart.findOneAndDelete({
      _id: cartId,
      user_id: user_id
    });

    // Check if the item was found and deleted
    if (result) {
      res.json({ success: true, message: "Product removed from cart" });
    } else {
      res.json({ success: false, message: "Product not found in cart" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


const incrementCartItemQuantity = async (req, res) => {
  try {
    const { productId } = req.body;
    const user_id = req.session.user_id;

    // Find the cart item by productId and user_id
    const cartItem = await Cart.findOne({ product_id: productId, user_id: user_id });

    if (!cartItem) {
      return res.json({ success: false, message: "Cart item not found" });
    }

    // Find the product to check its stock
    const product = await Product.findById(productId);

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    // Check if there is enough stock to increment
    if (product.quantity <= 0) {
      return res.json({ success: false, message: "Product is out of stock" });
    }

    // Check if the stock is sufficient for incrementing the cart item
    if (product.quantity <= cartItem.quantity) {
      return res.json({ success: false, message: "Cannot increment, not enough stock" });
    }

    // Proceed with updating the stock and cart item
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: -1 } },
      { new: true }
    );

    const updatedCartItem = await Cart.findOneAndUpdate(
      { product_id: productId, user_id: user_id },
      { $inc: { quantity: 1 } },
      { new: true } // Return the updated document
    );

    res.json({ success: true, newQuantity: updatedCartItem.quantity });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};



// Decrement quantity in cart
const decrementCartItemQuantity = async (req, res) => {
  try {
    const { productId } = req.body;
    const user_id = req.session.user_id;

    // Find the cart item by productId and user_id
    const cartItem = await Cart.findOne({ product_id: productId, user_id: user_id, quantity: { $gt: 1 } });

    if (!cartItem) {
      return res.json({ success: false, message: "Cannot decrement below 1" });
    }

    // Decrement the quantity in the Cart model
    const updatedCartItem = await Cart.findOneAndUpdate(
      { product_id: productId, user_id: user_id, quantity: { $gt: 1 } },
      { $inc: { quantity: -1 } },
      { new: true } // Return the updated document
    );

    // Increase the available quantity in the Product model
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: 1 } },
      { new: true }
    );

    res.json({ success: true, newQuantity: updatedCartItem.quantity });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};




module.exports = {
  loadCart,
  addToCart,
  removeFromCart,
  incrementCartItemQuantity,
  decrementCartItemQuantity
}


