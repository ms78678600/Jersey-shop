const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  listed: {
    type: Boolean,
    default: true,
  },
  createdOn:{
    type:Date,
    default:Date.now
  }
});

module.exports = mongoose.model('Category', categorySchema);
