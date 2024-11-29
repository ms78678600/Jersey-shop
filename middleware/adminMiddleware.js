const isLogin = async (req, res, next) => {
  try {
    if (req.session.isAdmin) {
      // If the user is an admin and their session is valid, allow access to the admin dashboard
      return next();
    } else if (req.session.user_id) {
      // If the user is logged in but not an admin, proceed to the next middleware or route handler
      return next();
    } else {
      // If neither an admin nor a regular user is logged in, redirect to the home page
      return res.redirect('/admin/adminLogin');
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.isAdmin) {
      // If the admin's session has been destroyed, redirect them to the admin login page
      return res.redirect('/admin/adminLogin');
    } else if (req.session.user_id) {
      // If a regular user is logged in, redirect to home
      return res.redirect("/home");
    } else {
      // If neither a user nor an admin is logged in, proceed to the next middleware or route handler
      return next();
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  isLogin,
  isLogout,
};
