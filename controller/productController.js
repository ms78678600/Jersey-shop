const Product = require('../model/productModel');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const categoryModel = require('../model/categoryModel');
const { default: mongoose } = require('mongoose');
const Wishlist=require('../model/wishlistModel')
const productModel = require('../model/productModel');
const Cart = require("../model/cartModel");
// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage }).fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'relatedImages', maxCount: 3 }
]);

// Function to crop image
async function cropImage(imagePath) {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  const image = await loadImage(imagePath);
  ctx.drawImage(image, 0, 0, 200, 200);
  return canvas.toBuffer('image/png');
}

// Function to show the add product page 
const showAddProductPage = async (req, res) => {
  try {

    const categories = await categoryModel.find({});


    res.render('admin/addProduct', { categories });
  } catch (error) {
    console.log(error);
  }
}



const createNewProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      marketPrice,
      salePrice,
      myCategory,
      quantity,
      size  // Add size to destructure from req.body
    } = req.body;

    let allImages = [];

    // Handle images field
    if (req.files.images && req.files.images.length > 0) {
      for (let i = 0; i < req.files.images.length; i++) {
        const originalImage = req.files.images[i];
        const croppedField = `croppedImage${i}`;
        if (req.files[croppedField] && req.files[croppedField].length > 0) {
          // If cropped image exists, use it instead of the original
          allImages.push({ filename: req.files[croppedField][0].filename });
        } else {
          // If no cropped image exists, use the original
          allImages.push({ filename: originalImage.filename });
        }
      }
    }

    // Check if category exists
    const categoryData = await categoryModel.findOne({ _id: myCategory });
    if (!categoryData) {
      return res.status(400).json({ message: "Category not found", success: false });
    }

    // Ensure size is provided and valid
    const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({ message: "Invalid or missing size", success: false });
    }

    const product = new productModel({
      productName,
      description,
      regularPrice: marketPrice,
      salesPrice: salePrice,
      category: categoryData._id,
      quantity,
      images: allImages,
      size  // Add size to the new product
    });

    const productData = await product.save();

    if (productData) {
      console.log("Product added successfully");
      return res.status(200).json({ message: "Product added successfully", success: true });
    }

    console.log("Failed to add product");
    return res.status(500).json({ message: "Failed to add product.", success: false });
  } catch (error) {
    console.log("Error in add product", error.message);
    return res.status(500).json({ message: "An error occurred.", success: false });
  }
};


const loadeditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = await productModel.findById(id);
    const categories = await categoryModel.find({});
    
    if (productData) {
      res.render("admin/EditProducts", { title: "Edit Product", product: productData, categories });
    } else {
      res.status(404).send("Product not found");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const loadProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = await productModel.findById(id);

    if (productData) {
      res.render("user/productDetails", { title: "Product Detail", products: productData });
    }
  } catch (error) {
    console.log(error.message);
  }
};






// Controller function to update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.body);
    
    const { productName, description, marketPrice, salePrice, category, quantity ,size} = req.body;
    console.log(category);
    

    console.log("Received form data for edit:", req.body); // Debug log

    let updatedImages = [];
    console.log("Files received for edit:", req.files); // Debug log

    if (req.files) {
      // Handle new images
      if (req.files.images && req.files.images.length > 0) {
        for (let i = 0; i < req.files.images.length; i++) {
          const originalImage = req.files.images[i];
          const croppedField = `croppedImage${i}`;
          if (req.files[croppedField] && req.files[croppedField].length > 0) {
            // If cropped image exists, use it instead of the original
            updatedImages.push({ filename: req.files[croppedField][0].filename });
          } else {
            // If no cropped image exists, use the original
            updatedImages.push({ filename: originalImage.filename });
          }
        }
      }
    }

    // Find the product and update its details
    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found", success: false });
    }

    product.productName = productName;
    product.description = description;
    product.regularPrice = marketPrice;
    product.salesPrice = salePrice;
    product.category = category;
    product.quantity = quantity;
    product.size=size


    // Update images only if new ones are uploaded
    if (updatedImages.length > 0) {
      product.images = updatedImages;
    }

    const updatedProduct = await product.save();

    if (updatedProduct) {
      console.log("Product updated successfully");
      return res.status(200).json({ message: "Product updated successfully", success: true });
    }

    console.log("Failed to update product");
    return res.status(500).json({ message: "Failed to update product.", success: false });
  } catch (error) {
    console.log("Error in edit product", error.message);
    return res.status(500).json({ message: "An error occurred.", success: false });
  }
};

const toggleManage = async (req, res) => {
  console.log("Toggle manage function called");

  try {
    const id = req.params.id;
    console.log("Product ID:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await productModel.findById(id);
    if (!product) {
      console.log("Product not found");
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log("Product found:", product);

    product.is_active = !product.is_active;
    console.log("Toggled is_active:", product.is_active);

    if (!product.is_active) {
      product.deleted = true;
      console.log("Marked as deleted");
    } else {
      product.deleted = false;
    }

    await product.save();

    const products = await productModel.find();

    res.render('admin/Addprd', { products: products });
  } catch (error) {
    console.error("Error toggling product:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Function for show the product management
const showProductManagement = async (req, res) => {
  try {
    // Get page number from query parameters, default to 1
    const page = parseInt(req.query.page) || 1;
    const limit = 4;  // Set number of products per page
    const skip = (page - 1) * limit;

    // Fetch products with pagination
    const products = await productModel.find().skip(skip).limit(limit);

    // Get the total number of products for pagination controls
    const totalProducts = await productModel.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);  // Calculate total number of pages

    // Render the page with products and pagination data
    res.render('admin/ProductManagement', {
      products,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};







const softDelete = async (req, res) => {
  try {
    const productId = req.params.id;
    

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.is_active = false;
    await product.save();

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};


const applyOffer = async (req, res) => {
  const { offerPercentage, productId } = req.body;

  console.log("iam applay offer", productId);
  console.log("iam applay offer", offerPercentage);

  try {
    // Find the product by ID
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Calculate the new sales price based on the offer percentage
    const discount = (product.salesPrice * offerPercentage) / 100;
    const newSalesPrice = product.salesPrice - Math.floor(discount);
    console.log(discount,"offer apply");
    
    

    // Update product with the new offer details
    product.offerPercentage = offerPercentage;
    product.salesPrice = newSalesPrice; // Update salesPrice with the new calculated price
    product.offerPrice = discount
    const updatedProduct = await product.save(); // Save the changes

    res.json({ success: true, message: 'Offer applied successfully', salesPrice: updatedProduct.salesPrice });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Failed to apply offer', error: error.message });
  }
};


const removeOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel.findById(productId);

    if (product) {
      // Assuming you previously calculated offerPrice when the offer was applied
      // const discount = product.salesPrice * (product.offerPercentage / 100);
      // console.log(discount)

      // Restore the sales price by adding back the discount
      product.salesPrice += product.offerPrice;
      product.offerPrice = 0 // Add back the discount to salesPrice
      product.offerPercentage = 0; // Reset the offer percentage

      const updatedProduct = await product.save();

      if (updatedProduct) {
        res.status(200).json({
          success: true,
          message: "Offer successfully removed.",
          salesPrice: updatedProduct.salesPrice // Optional: return the updated sales price
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Error updating product data after removing the offer.",
        });
      }
    } else {
      return res.status(400).json({ success: false, message: "Product not found." });
    }

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "An error occurred.", error: error.message });
  }
};


// Add this route to your adminRouter




const showShopProduct = async (req, res) => {
  try {
    const { page = 0, sort } = req.query;
    const limit = 4; 
    const currentPage = parseInt(page);
    const skip = currentPage * limit;

    let sortCriteria = {};

    // Set sort criteria based on query string
    if (sort === 'price-asc') {
      sortCriteria = { salesPrice: 1 }; // Price: Low to High
    } else if (sort === 'price-desc') {
      sortCriteria = { salesPrice: -1 }; // Price: High to Low
    } else if (sort === 'new-arrivals') {
      sortCriteria = { createdOn: -1 }; // New Arrivals (sort by creation date, newest first)
    }

    // Get the total number of products for pagination
    const totalProducts = await productModel.countDocuments({is_active:true, quantity: { $gt: 0 } });
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch products with pagination, sorting, and filtering
    const products = await productModel.find({is_active:true, quantity: { $gt: 0 } })
      .populate('category')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

    // Fetch all categories for filter dropdown
    const categories = await categoryModel.find();

    // Render the shop page with the fetched data
    
    res.render('user/shope', {
      products,
      currentPage,
      totalPages,
      categories, // Pass categories for the filter dropdown
      selectedSort: sort // Pass selected sort to keep the UI state
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};


const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;

    // Check if user is logged in
    if (!userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, products: [productId] });
    } else if (wishlist.products.includes(productId)) {
      return res.status(400).json({ message: "Product already in wishlist" });
    } else {
      wishlist.products.push(productId);
    }

    // Save the wishlist
    await wishlist.save();
    return res.status(200).json({ message: "Product added to wishlist", wishlist });
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    return res.status(500).json({ message: "Error adding product to wishlist" });
  }
};



const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;
    const wishlist = await Wishlist.findOne({ user: userId });

    if (wishlist && wishlist.products.includes(productId)) {
      wishlist.products = wishlist.products.filter(
        (item) => item.toString() !== productId
      );
      await wishlist.save();
      return res.status(200).json({ message: "Product removed from wishlist" });
    } else {
      return res.status(400).json({ message: "Product not found in wishlist" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Error removing product from wishlist" });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;  // Get the user ID from session

    // Check if the user is logged in
    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    // Fetch the user's wishlist
    const wishlist = await Wishlist.findOne({ user: userId }).populate('products');  // Populate product details

    // If no wishlist exists, return an empty array
    if (!wishlist) {
      return res.render('user/wishlist', { wishlistItems: [] });
    }

    // Render the wishlist page with the wishlist items
    return res.render('user/wishlist', { wishlistItems: wishlist.products });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({ message: 'Error fetching wishlist' });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;
    const qty = 1; // Default quantity when adding from wishlist

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the product is in stock
    if (product.quantity < qty) {
      return res.status(400).json({ message: "Out of stock" });
    }

    // Add the product to the cart
    let cartItem = await Cart.findOne({ user_id: userId, product_id: productId });
    if (cartItem) {
      // If the product already exists in the cart, increment the quantity
      cartItem.quantity += qty;
      if (cartItem.quantity > 10) {
        return res.status(400).json({ message: "You cannot add more than 10 items" });
      }
      await cartItem.save();
    } else {
      // Otherwise, create a new cart item
      const newCartItem = new Cart({
        user_id: userId,
        product_id: productId,
        quantity: qty,
        productPrice: product.salesPrice,
      });
      await newCartItem.save();
    }

    // Optionally, remove the product from the wishlist after adding to cart
    let wishlist = await Wishlist.findOne({ user: userId });
    if (wishlist && wishlist.products.includes(productId)) {
      wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
      await wishlist.save();
    }

    // Reduce product stock
    product.quantity -= qty;
    await product.save();

    // Redirect back to wishlist or show success message
    return res.status(200).json({ success: true, message: "Product added to cart and removed from wishlist" });

  } catch (error) {
    console.error("Error adding product to cart from wishlist:", error);
    return res.status(500).json({ message: "Error adding product to cart" });
  }
};






module.exports = {
  createNewProduct,
  upload,
  updateProduct,
  toggleManage,
  showProductManagement,
  showAddProductPage,
  softDelete,
  showShopProduct,
  loadeditProduct,  
  loadProductDetail,
  addToWishlist,
  addToCartFromWishlist,
  removeFromWishlist,
  getWishlist,
  applyOffer,
  removeOffer

};
