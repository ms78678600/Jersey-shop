const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const crypto = require('crypto');
// const router=require('./router')
const adminRouter=require('./routs/adminRout')
const userRouts=require('./routs/userRouts')

const secretID = crypto.randomBytes(32).toString('hex');

const port = process.env.PORT || 7000;

const db = require('./model/db');
require('dotenv').config();
db();

const User = require('./model/userSchema');

app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')));



app.use(express.json());

app.use(session({
  secret: secretID,
  resave: false,
  saveUninitialized: true
}));

// Use the router for all routes
// app.use('/',router)
app.use('/',userRouts );
app.use('/',adminRouter)

// Remove the route definition for /home from index.js
userRouts.get('/home', (req, res) => {
  res.render('home');
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
