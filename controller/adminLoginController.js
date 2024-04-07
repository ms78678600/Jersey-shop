const jwt = require('jsonwebtoken');
const adminLoginController = {};

const adminEmail = "admin@gmail.com";
const adminPassword = "admin1234";
const secretKey = "your_secret_key"; // Change this to a strong, unique secret key

adminLoginController.renderLoginForm = (req, res) => {
  res.render('adminlog');
};

adminLoginController.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (email !== adminEmail || password !== adminPassword) {
      return res.render('adminlog', { err: true, message: 'Invalid email or password' });
    }

    // If email and password are correct, create a JWT token with an expiration time of 1 hour
    const token = jwt.sign({ email: adminEmail }, secretKey, { expiresIn: '1h' });
    req.session.adminLogin = true;
    req.session.adminToken = token;

    // Redirect to the dashboard page
    res.redirect('/adminDashboard');
  
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during login');
  }

};

adminLoginController.dashbordRedirect = async (req, res) => {
  // Check if the user is logged in as admin
  if (!req.session.adminLogin) {
    // If not logged in, redirect to the admin login page
    return res.redirect('/adminLogin');
  }

  res.render('adminDashboard');
}


// adminLogOut
adminLoginController.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error during logout');
    }
    res.redirect('/adminLogin'); // Redirect to admin login page after logout
  });
};


module.exports = adminLoginController;
