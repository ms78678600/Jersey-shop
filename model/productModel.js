const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true
  },
  popularity: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  // brand: {
  //   type: String,
  //   required: true
  // },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  regularPrice: {
    type: Number,
    required: true
  },
  salesPrice: {
    type: Number,
    required: true,
  },
  // size: {
  //   type: String,
  //   required: true
  // },
  createdOn: {
    type: Date,
    required: true,
    default: Date.now
  },
  // stock: {
  //   type: Number,
  //   required: true
  // },
  is_active: {
    type: Boolean,
    required: true,
    default: true
  },
  quantity: {
    type: Number,
    required: true
  },
  images: [
    {
      filename: {
        type: String,
        required: true
      }
    }
  ]
});

productSchema.pre('validate', function(next) {
  console.log("Validating product:", this);
  next();
});

module.exports = mongoose.model("Product", productSchema);





