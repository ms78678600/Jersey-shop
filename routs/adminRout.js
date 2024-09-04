const express = require('express');
const adminRouter = express.Router();
const adminLoginController = require('../controller/adminLoginController');
const productController = require('../controller/productController')
const categoryController = require('../controller/categoryController');
const categoryModel = require('../model/categoryModel');
const UsersController = require('../controller/UsersController');
const orderController = require('../controller/orderController');
// const auth=require('../middleware/auth')
const path = require('path');
require("dotenv").config();

const admin = express()


const multer = require("multer");
const { auth } = require('google-auth-library');

const uploadFields = [
  { name: 'images', maxCount: 10 },
  { name: 'croppedImage0', maxCount: 1 },
  { name: 'croppedImage1', maxCount: 1 },
  { name: 'croppedImage2', maxCount: 1 }
];

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/uploads");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const upload = multer({ storage: storage });


adminRouter.get('/product-management', productController.showProductManagement);
// adminRouter.get('/product-management', productController.getProduct)
adminRouter.get('/add-product', productController.showAddProductPage);
// adminRouter.post('/add-product', productController.upload, productController.createNewProduct);

adminRouter.post('/add-product', upload.fields(uploadFields), productController.createNewProduct);

// editProduct
adminRouter.get('/edit-product/:id', productController.loadeditProduct);
adminRouter.post('/edit-product/:id',upload.fields(uploadFields), productController.updateProduct);
adminRouter.delete('/delete-product/:id', productController.softDelete)

// toogle route
adminRouter.get('/toogle/:id', productController.toggleManage);

// Admin routes
adminRouter.get('/adminLogin', adminLoginController.renderLoginForm);//show admin login
adminRouter.post('/adminLogin', adminLoginController.login);
adminRouter.get('/adminDashboard', adminLoginController.dashbordRedirect);

// categories
adminRouter.get('/categories', categoryController.showCategoryPage); // Get all categories
adminRouter.get('/categories/:categoryId', categoryController.fetchSingleCategory); // Get all categories
adminRouter.get('/addcategories', categoryController.showAddCategoryPage);
adminRouter.post('/addcategories', categoryController.addCategory); // Add a new category
adminRouter.put('/categories/:categoryId', categoryController.updateCategory); // Update a category
adminRouter.delete('/categories/:categoryId', categoryController.deleteCategory);
adminRouter.post('/categories/:categoryId/list', categoryController.listCategory); // List a category
adminRouter.post('/categories/:categoryId/unlist', categoryController.unlistCategory); // Unlist a category

// get userScheema
adminRouter.get('/users', UsersController.findUsers);

// Toggle user block/unblock
adminRouter.put('/users/toggle', UsersController.userToggleManage);


// Admin logout route
adminRouter.get('/logout',adminLoginController.logout)

adminRouter.get("/orderManagement",orderController.loadAdminOrderManagement);
adminRouter.get("/view-orderDetails/:orderId",orderController.loadAdminOrderView);
adminRouter.post('/update-order-status/:orderId', orderController.updateOrderStatus);



module.exports = adminRouter