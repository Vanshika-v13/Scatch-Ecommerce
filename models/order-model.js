const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
      quantity: Number,
    }
  ],
   platformFee: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  totalAmount: Number,
  address: {
    fullname: String,
    address: String,
    city: String,
    pincode: String
  },
  status: {
  type: String,
  enum: ["Placed", "Shipped", "Delivered", "Cancelled"],
  default: "Placed"
},
  paymentMethod: String, // "UPI" or "COD"
  
  placedAt: { type: Date, default: Date.now }
},{ timestamps: true });

module.exports = mongoose.model("order", orderSchema);


