const User = require('../model/userSchema');
const otpgenerator = require('generate-otp');
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const nodemailer = require('nodemailer');

const singnupCo = {};

// Mail function to send OTP
async function mail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: "suhailrk910@gmail.com",
      pass: "isok psqe zghs uqeg"
    }
  });

  const html = `<p>Your OTP is: ${otp}</p>`;

  const mailOptions = {
    from: "abc@gmail.com",
    to: email,
    subject: "OTP Verification",
    html: html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(info);
  } catch (error) {
    console.error("Error occurred while sending email:", error);
    throw error;
  }
}

// Manage Signup Logic
singnupCo.manageSignup = async (req, res) => {
  try {
    console.log("req",req.body)
    const { name, email, phonenumber, password, confirmpassword } = req.body;

    console.log("Emaillll",req.body.email)
    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required' });
    }

    const duplicateUser = await User.findOne({ email });
    if (duplicateUser) {
      return res.status(400).json({ status: 'error', message: 'Email already exists' });
    }

    const otpLength = 6;
    const otp = otpgenerator.generate(otpLength, { digits: true, alphabets: false, specialChars: false });
    console.log(otp);
    if (password !== confirmpassword) {
      return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
    }

    // Send OTP via email
    await mail(email, otp);

    req.session.data = {
      name,
      email,
      phonenumber,
      password,
      otp,
      timestamp: Date.now(),
      expireOtp: 5 * 60 * 1000
    };

    req.session.isSignup = true;
    return res.json({ status: 'success' });
  } catch (error) {
    console.error("Error occurred while managing sign up:", error);
    return res.status(500).json({ status: 'error', message: 'An error occurred. Please try again' });
  }
};

// Display Signup Page
singnupCo.displaySingnup = (req, res) => {
  try {
    if (!req.session.userActive) {
      res.render('signUp');
    } else {
      res.render('/home');
    }
  } catch (error) {
    console.error("Error occurred while rendering sign up page:", error);
    res.render('error');
  }
};

// Show OTP Page
singnupCo.showOtp = (req, res) => {
  try {
    if (req.session.isSignup) {
      res.render('verification');
    } else {
      res.redirect('/signUp');
    }
  } catch (error) {
    console.error("Error occurred while rendering OTP page:", error);
    res.render('error');
  }
};

// manageOtp
singnupCo.manageOtp = async (req, res) => {
  try {
    console.log("hello aslah");
    const enteredOtp = req.body.otp;
    console.log(enteredOtp);
    const userData = req.session.data;
    console.log(req.session.data);
    const { otp, expireOtp, timestamp } = userData;

    const isExpired = Date.now() - timestamp > expireOtp;
    if (isExpired) {
      return res.json({ status: 'error', message: 'OTP expired' });
    }
    if (enteredOtp === otp) {
      console.log("otp match");
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const newUser = new User({
        name: userData.name,
        email: userData.email,
        phonenumber: userData.phonenumber,
        password: hashedPassword
      });

      // Store user data
      try {
        const storeUser = await newUser.save();

        // Set session variable
        req.session.userActive = true;

        // Clear session data
        delete req.session.data;
        delete req.session.isSignup;

        // Generate a JWT
        const token = jwt.sign({ userId: storeUser._id }, "secretKey", { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true, secure: false });
        
        // Redirect user to home page after successful signup
        res.redirect('home');
      } catch (error) {
        console.log("Error occurred while saving user data:", error.message);
        res.json({ status: 'error', message: 'An error occurred while saving user data' });
      }
    } else {
      res.json({ status: 'error', message: 'OTP does not match, please enter correct OTP' });
    }
  } catch (error) {
    console.error("Error occurred while managing OTP:", error);
    res.render('error');
  }
}


// //resent otp
singnupCo.resentOtp=async(req,res)=>{
  try{
    const data=req.session.data
    const email=data.email

    // generate otp

    const otpln=6
    const otpNew=otpgenerator.generate(otpln,{digits:true,lowerCaseAlphabets:false,upperCaseAlphabets:false,specialChars:false})
    const expireOtpNew=5*60*1000
    
    // store data in session tempororly
    req.session.data.otp=otpNew
    req.session.data.expireOtp=expireOtpNew
    req.session.data.timestamp=Date.now()
    await mail(email,otpNew)
    res.redirect('/otp-verification')
  }catch(erorr){
    res.render('error')
  }console.log("Error occured in resend otp",erorr.message);
}

module.exports = singnupCo;
