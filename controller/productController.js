const Product = require('../model/productModel');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const categoryModel = require('../model/categoryModel');
const { default: mongoose } = require('mongoose');
const productModel = require('../model/productModel');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
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

// Controller function for adding a new product
const addProduct = async (req, res) => {
  console.log("in add product")
  try {

    // Extract product details from the request body
    const {

      productName,
      Brand,
      description,
      category,
      RegularPrice,
      salePrice,
      size,
      stock,
      productOffer,
      is_active,
      mainImage,
      relatedImages
    } = req.body;
    
const categoryId=new mongoose.Types.ObjectId(category)

    // Create a new product object
    const newProduct = new Product({
      productName,
      Brand,
      description,
      category:categoryId,
      RegularPrice,
      salePrice,
      size,
      createdOn: new Date(),
      stock,
      productOffer,
      is_active
    });

    // Handle main image upload and crop
    if (req.files['mainImage'] && req.files['mainImage'].length > 0) {
      const mainImagePath = req.files['mainImage'][0].path;
      const croppedMainImageBuffer = await cropImage(mainImagePath);
      fs.writeFileSync(mainImagePath, croppedMainImageBuffer);
      newProduct.mainImage = mainImagePath;
    }

    // Handle related images upload
    if (req.files['relatedImages'] && req.files['relatedImages'].length > 0) {
      newProduct.relatedImages = req.files['relatedImages'].map(image => image.path);
    }

    // Save the product to the database
    const saveproduct=await newProduct.save();
    
    await categoryModel.findOneAndUpdate(categoryId,{
      $push:{products:saveproduct._id}
    })



    res.status(201).json({ success: true, message: 'Product added successfully' });
  } catch (error) {
    // If an error occurs, delete uploaded files
    if (req.files['mainImage'] && req.files['mainImage'].length > 0) {
      fs.unlinkSync(req.files['mainImage'][0].path);
    }
    if (req.files['relatedImages'] && req.files['relatedImages'].length > 0) {
      req.files['relatedImages'].forEach(file => fs.unlinkSync(file.path));
    }
    res.status(500).json({ success: false, message: 'Failed to add product', error: error.message });
  }
};

// Controller function for listing all products
const listProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('category')
    const category=await categoryModel.find()
    res.render('listTable', { products,category}); // Render the productList.ejs file with the products data
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

// Controller function to edit a product
const editProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.render('editProduct', { product });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Controller function to update a product
const updateProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Update the product fields based on request body
    Object.assign(product, req.body);
    // Save the updated product
    await product.save();
    return res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Controller function to toggle the publish status of a product
const toggleManage = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productModel.findById(id);

    if (product) {
      product.is_active = !product.is_active;

      if (!product.is_active) {
        product.deleted = true;
      }

      await product.save();
      const products=await productModel.find()
      res.render('listTable', { products: products })   
     } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error });
  }
};


module.exports = {
  addProduct,
  upload,
  listProducts,
  editProduct,
  updateProduct,
  toggleManage
  
};
