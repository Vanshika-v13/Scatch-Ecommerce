const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  image: {
    type: String, // path as string
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
   
  availability: {
  type: Boolean, 
  default: true,
},
  bgcolor: String,
  panelcolor: String,
  textcolor: String,
}, { timestamps: true });

const Product = mongoose.model("product", productSchema);
module.exports = Product;
