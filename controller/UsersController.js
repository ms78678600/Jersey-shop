const mongoose = require('mongoose');
const Address=require('../model/addressSchema')
const User = require('../model/userSchema'); // Ensure the correct path to your User model
const Product = require('../model/productModel');
const orderModel = require('../model/orderScheema');
const signupController = require('../controller/signupController');
const bcrypt=require('bcrypt')
const mail = signupController.mail
const otp=signupController.otp

const verifyMail = async (req, res) => {
  try {
    const user_id = req.session._id;
    const loggedIn = req.session.isAuth ? true : false;
    console.log('in verify')
    res.render("user/verifyForgetPass", {
      loggedIn,
      title: "User verification",
    });
  } catch (error) {
    console.log(error.message);
  }
};
const loadForgetPassword = async (req, res) => {
  try {
    res.render("user/checkOTPpass", { message: "" });
  } catch (error) {
    console.log(error.message);
  }
};

const otpgenerator = require('generate-otp'); // Ensure you have this dependency
const productModel = require('../model/productModel');
const categoryModel = require('../model/categoryModel');

const verifyforgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(email);
    console.log("in verify2");

    const userData = await User.findOne({ email: email });
    console.log(userData);

    if (userData) {
      console.log(req.session.tempUserData);
      req.session.tempUserData = { email };

      console.log(email)

      // Generate OTP
      const otpLength = 4;
      const otp = otpgenerator.generate(otpLength, { digits: true, alphabets: false, specialChars: false });
      
      // Store OTP in session for later verification
      req.session.otp = otp;
console.log(otp);
      // Send OTP via email
      await mail(email, otp);

      res.redirect("/checkOTPpass");
    } else {
      res.render("user/verifyForgetPass", { message: "Email is incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};


const verifycheckOTPpass = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);
    const email = req.session.tempUserData;
    if (req.session.otp === otp) {
      res.redirect("/resetpassword");
    } else {
      res.render("user/checkOTPpass", { message: "Incorrect OTP" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadResetPassword = async (req, res) => {
  try {
    console.log('hlo');
    res.render("user/resetpassword");
  } catch (error) {
    console.log(error.message);
  }
};
const verifyResetPassword = async (req, res) => {
  try {
    const newPassword = req.body.newPassword;
    if (!newPassword) {
      throw new Error("New password is required");
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
console.log(req.session.tempUserData);
     const { email } = req.session.tempUserData;
    const userData = await User.findOne({ email: email });
    if (!userData) {
      throw new Error("User not found");
    }

    userData.password = hashedNewPassword;
    const updatedPass = await userData.save();

    if (updatedPass) {
      res.redirect("/login");
    } else {
      res.status(500).send("Error updating password");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
};




// Finding users in the database
const findUsers = async (req, res) => {
  try {
    const users = await User.find({});
    console.log(users);
    res.render('admin/UsersManagement', { users });
  } catch (error) {
    console.log('Error in fetching users', error);
    res.status(500).send('Server Error');
  }
};

// User block/unblock management
const userToggleManage = async (req, res) => {
  try {
   
    const { id } = req.body;


    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });

    }

    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ success: true, newStatus: user.isBlocked });
  } catch (error) {
    console.log('Error in toggling user status', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
const googleSignup = async (req, res) => {
  try {
    const { email, displayName } = req.user;

    // Check if the user already exists
    let user = await User.findOne({ email: email });
    if (user) {
      req.session.user_id = user._id;

      return res.redirect("/user/home");
    } else {
      // Create a new user
      user = new User({
        name: req.user.displayName,
        email: req.user.emails[0].value,
        image: req.user.photos[0].value,
      });
    }

    // Save the user to the database
    await user.save();

    // Save the user ID to the session
    req.session.user_id = user._id;

    // Log user info for debugging purposes
    console.log(`User created/updated: ${email}, ${displayName}`);

    // Redirect to the home page or send a response
    res.redirect("user/home");
  } catch (error) {
    console.error("Error signing up user:", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadHome = async (req, res) => {
  try {
    const products=await productModel.find({is_active:true,quantity:{$gt:0}})
    .populate('category')
    .limit(10)
    res.render('user/home',{products}); // Ensure this path matches your views directory structure
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};
const loadPasswordSettings=async(req,res)=>{
  res.render('user/passwordSettings',{
    user:req.user
  })
}
const resetPassword = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.json({ status: 'error', message: 'Passwords do not match.' });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.json({ status: 'error', message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.json({ status: 'error', message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return res.json({ status: 'success', message: 'Password reset successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};




const searchProduct = async (req, res) => {
  try {
    const searchTerm = req.query.q || ''; // Get the search query from the URL
    const regex = new RegExp(searchTerm, 'i'); // Create a case-insensitive regex pattern

    const products = await productModel.find({
      productName: regex,
      is_active: true
    }).populate('category');

    res.render('user/searchResults', { product: products, searchProduct: searchTerm });
  } catch (error) {
    console.log(error);
    res.status(500).send('Server Error');
  }
};


const logout=async(req,res)=>{
  req.session.destroy((error)=>{
    if(error){
      return res.status(500).send('Error during logout');
    }else{
      res.redirect('/login');
    }
  });
  
}





  const myAccount = async (req, res) => {
    try {
      const user_id = req.session.user_id
      
      const users = await User.findById(user_id);
      const addressData=await Address.find({user_id:user_id}); // Get a single user
      const orderDetails = await orderModel.find({ user : user_id }).populate("products.productId")
      
      res.render('user/myAccount',  { users, addresses: addressData, orders:orderDetails });; // Pass the single user object
    
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  };

const editUserProfile=async(req,res)=>{
try{
  const user_id = req.params.id;
  const userData = await User.findById(user_id);

  if (!userData) {
    return res.status(404).send('User not found');
  }
  res.render('user/editUserProfile',{users:userData});

}catch(error){
  console.error(error);
  res.status(500).send('Server Error');
}
}


const updateProfile = async (req, res) => {
  try {
    console.log("Received data:", req.body);
    const { name, email, mobile } = req.body;
    const user_id = req.params.id;

    const userData = await User.findByIdAndUpdate(
      user_id,
      { name: name, email: email, phonenumber: mobile },
      { new: true }
    );

    console.log("Updated user data:", userData);

    if (!userData) {
      return res.status(404).send('User not found');
    }

    return res.redirect('/myAccount');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

const ShowOrderDetails = async(req,res)=>{
  try {
      const user_id = req.session.user_id
      const productId = req.params.productId;
      const orderId = req.params.orderId;
      const userData = await User.findById(user_id)
      const order = await orderModel.findOne({ _id : orderId , user : user_id })
      .populate('address').populate({
          path: 'products.productId',
      });
      console.log(order)
      res.render("user/orderDetails",{
          order,
          products:productId,
          user : userData
      })

  } catch (error) {
      console.log(error.message);
  }
}




module.exports = { findUsers, 
  userToggleManage,
  loadHome,
  verifyMail,
  loadForgetPassword,
  verifyforgetPassword,
  verifycheckOTPpass,
  loadResetPassword,
  verifyResetPassword ,
  googleSignup,
  logout,
  myAccount,
  editUserProfile,
  updateProfile,
  searchProduct,
  ShowOrderDetails,
  loadPasswordSettings,
  resetPassword
  };
