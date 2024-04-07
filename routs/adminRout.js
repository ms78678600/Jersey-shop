const express = require('express');
const adminRouter = express.Router();
const adminLoginController = require('../controller/adminLoginController');
const productController = require('../controller/productController')
const categoryController=require('../controller/categoryController');
const categoryModel = require('../model/categoryModel');




adminRouter.get('/list-products', productController.listProducts); // Route to list products

adminRouter.post('/add-productt', productController.upload, productController.addProduct);
adminRouter.get('/add-product', async(req, res) => {
  const categories= await categoryModel.find()
  res.render('addProduct',{categories}); // Renders the addProduct.ejs file 
});

// editProduct
adminRouter.get('/products/:id', productController.editProduct);
adminRouter.post('/products/:id/edit', productController.updateProduct);

// toogle route
adminRouter.get('/toogle/:id', productController.toggleManage);

// publish/unpublish route
// adminRouter.put('/products/:productId/publish',productController.publishProduct)

// adminRouter.get('/page-products-list', (req, res) => {
//   // Assuming "product list.ejs" is located in the "views" directory
//   res.render('productlist');
// });



// Admin routes
adminRouter.get('/adminLogin', adminLoginController.renderLoginForm);
adminRouter.post('/adminLogin', adminLoginController.login);
adminRouter.get('/adminDashboard', adminLoginController.dashbordRedirect);
adminRouter.get('/categories', categoryController.showCategoryPage); // Get all categories
adminRouter.post('/addcategories', categoryController.addCategory); // Add a new category
adminRouter.put('/categories/:categoryId', categoryController.updateCategory); // Update a category
adminRouter.delete('/categories/:categoryId', categoryController.deleteCategory); 

// Admin logout route
adminRouter.get('/adminLogout', adminLoginController.logout);




module.exports=adminRouter