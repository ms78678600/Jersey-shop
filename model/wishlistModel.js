const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wishlistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true  // Ensure this is marked as required
  }]
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
