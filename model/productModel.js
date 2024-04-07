const mongoose = require('mongoose');
const category=require('../model/categoryModel')
const { Schema } = mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true
  },
  Brand: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"Category"
  },
  RegularPrice: {
    type: Number,
    required: true
  },
  salePrice: {
    type: Number,
    required: true,
  },
  size: {
    type: String,
    required: true
  },
  createdOn: {
    type: Date,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  productOffer: {
    type: Number,
    required: true
  },
  is_active: {
    type: Boolean,
    required: true
  },
  mainImage: {
    type: String,
    required: true
  },
  relatedImages: {
    type: Array, // Array of strings for related images
    required: true
  }
});

module.exports = mongoose.model("Product", productSchema);
