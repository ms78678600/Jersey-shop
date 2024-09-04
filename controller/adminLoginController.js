const jwt = require('jsonwebtoken');
const productModel = require('../model/productModel');
const adminLoginController = {};

const adminEmail = "admin@gmail.com";
const adminPassword = "123456";
const secretKey = "your_secret_key"; // Change this to a strong, unique secret key

adminLoginController.renderLoginForm = (req, res) => {
  res.render('admin/adminlog');
};

adminLoginController.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (email !== adminEmail || password !== adminPassword) {
      return res.render('admin/adminlog');
    }

    // If email and password are correct, create a JWT token with an expiration time of 1 hour
    const token = jwt.sign({ email: adminEmail }, secretKey, { expiresIn: '1h' });
    req.session.adminLogin = true;
    req.session.adminToken = token;

    // Redirect to the dashboard page
    res.redirect('/admin/adminDashboard');
  
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during login');
  }

};

adminLoginController.addProductPage = async(req,res)=>{

  const products=await productModel.find()

    return res.render('admin/Addprd',{products});
  }



adminLoginController.dashbordRedirect = async (req, res) => {
  // Check if the user is logged in as admin
  if (!req.session.adminLogin) {
    // If not logged in, redirect to the admin login page
    return res.redirect('/adminLogin');
  }

  res.render('Admin/adminDashboard');
}


// adminLogOut
adminLoginController.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error during logout');
    }
    res.redirect('/admin/adminLogin'); // Redirect to admin login page after logout
  });
};


module.exports = adminLoginController;
