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
  offerPercentage: {
    type: Number,
    default: 0
  },
  offerPrice: {
    type: Number,

  },
  size: {
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    required: true
  },
  createdOn: {
    type: Date,
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

// productSchema.pre('validate', function (next) {
//   // Calculate offerPrice if offerPercentage is provided
//   if (this.offerPercentage > 0) {
//     this.offerPrice = this.salesPrice - (this.salesPrice * this.offerPercentage / 100);
//   } else {
//     this.offerPrice = this.salesPrice;
//   }
//   next();
// });

module.exports = mongoose.model("Product", productSchema);





