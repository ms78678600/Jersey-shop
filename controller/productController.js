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

    const categoryData = await categoryModel.findOne({ _id: myCategory });

    if (!categoryData) {
      return res
        .status(400)
        .json({ message: "Category not found", success: false });
    }

    console.log(allImages, "allImages");

    const product = new productModel({
      productName: productName,
      description: description,
      regularPrice: marketPrice,
      salesPrice: salePrice,
      category: categoryData._id,
      quantity: quantity,
      images: allImages,
    });

    const productData = await product.save();

    if (productData) {
      console.log("Product added successfully");
      return res
        .status(200)
        .json({ message: "Product added successfully", success: true });
    }

    console.log("Failed to add product");
    return res
      .status(500)
      .json({ message: "Failed to add product.", success: false });
  } catch (error) {
    console.log("error in add product", error.message);
    return res
      .status(500)
      .json({ message: "An error occurred.", success: false });
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

const loadProductDetail=async(req,res)=>{
  try{
    const {id}=req.params
    
    const productData=await productModel.findById({ _id: id })

    console.log('this is my product',productData)
    if(productData){
      res.render("user/productDetails",{title:"Product Detail",products:productData})
    }
  }catch(error){
    console.log(error.message)
  }
}










// Controller function to update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, description, marketPrice, salePrice, myCategory, quantity } = req.body;

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
    product.category = myCategory;
    product.quantity = quantity;

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
    const products = await productModel.find();
    res.render('admin/productManagement', { products });
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
    const totalProducts = await productModel.countDocuments({});
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await productModel.find({ quantity: { $gt: 0 } })
      .populate('category')
      .sort(sortCriteria) // Apply sorting
      .skip(skip)
      .limit(limit);

      res.render('user/shope', {
      products,
      currentPage,
      totalPages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
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
 

};
