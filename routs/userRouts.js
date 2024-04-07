const express = require('express');

const singnupCo = require('../controller/signupController');
const loginController = require('../controller/loginController');
const userRouts=express.Router()



// Signup routes
userRouts.get('/signUp', singnupCo.displaySingnup);
userRouts.post('/signUp', singnupCo.manageSignup);

// Landing page route
userRouts.get('/', loginController.displayLandingPage);

// Verification routes
userRouts.get('/otp-verification', singnupCo.showOtp);
userRouts.post('/verify-otp', singnupCo.manageOtp);

// Login routes
userRouts.get('/login', loginController.displayLogin);
userRouts.post('/login', loginController.manageLogin);

// userLogout
userRouts.get('/userLogout',loginController.logout)

module.exports=userRouts
