//loging controller
const User=require('../model/userSchema')
const bcrypt=require('bcrypt')

const loginController={}


// landing page showing
loginController.displayLandingPage=async(req,res)=>{
  try {
    if(!req.session.userActive){
      res.render('landing')
    }else{
      res.redirect('/home')
    }
    
  } catch (error) {
    res.render('error')
    console.log("error occured",error)
  }
 }

// display login page
loginController.displayLogin=async(req,res)=>{
  if(!req.session.userActive){
    res.render('login')
  }else{
    redirect("/signUp")
  }
}
 



// manageLogin
loginController.manageLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await User.findOne({ email });
    
    if (!customer) {
      return res.json({ status: 'error', message: "No user found. Please sign up" });
    }
    
    try {
      const comparePassword = await bcrypt.compare(password, customer.password);
      
      if (!comparePassword) {
        return res.json({ status: 'error', message: "Password is wrong" });
      }

      // If password comparison is successful, you might want to proceed with generating a JWT or some other form of authentication.

      customer.lastLogin = new Date(); // Updating last login timestamp
      console.log(customer.lastLogin);
      await customer.save();
      res.render("home")

    } catch (error) {
      console.log("Password compare error:", error);
      return res.json({ status: 'error', message: "An error occurred. Please try again" });
    }
  } catch (error) {
    console.log("Error in login:", error);
    return res.json({ status: 'error', message: "An error occurred. Please try again" });
  }
};

// userlogout
loginController.logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ status: 'error', message: 'An error occurred during logout' });
      }
      res.redirect('/login'); // Redirect to login page after logout
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred during logout' });
  }
};





module.exports=loginController