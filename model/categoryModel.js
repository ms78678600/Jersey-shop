// categoryModel.js
const mongoose = require('mongoose');
const product=require('../model/productModel')

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
products:[
  {
    type:mongoose.Schema.Types.ObjectId,
    ref:"Product"
  }
]
});

module.exports = mongoose.model('Category', categorySchema);
