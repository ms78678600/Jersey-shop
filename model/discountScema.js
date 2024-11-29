const mongoose = require('mongoose');

// Define Discount Schema
const discountSchema = new mongoose.Schema({
  discountDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  offerType: {
    type: String,
    enum: ['coupon', 'category', 'referral'],  // You can extend this as needed
    required: true,
  },
  category: {
    type: String,
    default: null,  // This can be optional, used only for category-based discounts
  },
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Assuming referral ID links to a User model
    default: null,  // Set default as null for non-referral discounts
  },
  couponCode: {
    type: String,
    default: null,  // Only relevant for coupon-based discounts
  },
  offerDeduction: {
    type: Number,
    required: true,  // Store the actual discount amount applied
  },
});

// Create and export the model
module.exports = mongoose.model('Discount', discountSchema);
