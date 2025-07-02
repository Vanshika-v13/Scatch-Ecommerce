const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");

const productModel=require("../models/product-model");


router.get("/buynow/:productId", isLoggedIn, async (req, res) => {
  try {
    const product = await productModel.findById(req.params.productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/shop");
    }

    const user = await userModel.findById(req.user._id);
    const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];

    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 5);

    res.render("buynow-checkout", {
      product,
      addresses: user.addresses,                         // all addresses
      defaultAddressId: defaultAddress?._id?.toString(), // for dropdown selection
      arrivalDate: arrivalDate.toDateString(),           // optional
      user,
      success: req.flash("success"),
      error: req.flash("error")
    });

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/shop");
  }
});



router.post("/buynow/confirm", isLoggedIn, async (req, res) => {
  try {
    const { productId, quantity, addressId, paymentMethod } = req.body;
    const product = await productModel.findById(productId);
    const user = await userModel.findById(req.user._id);
    const address = user.addresses.id(addressId); // from nested array

    if (!product || !address) {
      req.flash("error", "Invalid product or address");
      return res.redirect("/shop");
    }

    const qty = parseInt(quantity);
    const itemTotal = product.price * qty;
    const shippingFee = 49;
    const total = itemTotal + shippingFee;

    // Calculate arrival date = today + 5 days
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 5);

    res.render("buy-confirm", {
      product,
      quantity: qty,
      address,
      paymentMethod,
      shippingFee,
      total,
      price: itemTotal,
      arrivalDate,
      success: req.flash("success"),
      error: req.flash("error"),
    });
  } catch (err) {
    console.error("Buy Now Confirm Error:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/shop");
  }
});



router.post("/buynow/place-order", isLoggedIn, async (req, res) => {
  try {
    const { productId, quantity, addressId, paymentMethod } = req.body;

    const user = await userModel.findById(req.user._id);
    const product = await productModel.findById(productId);
    const selectedAddress = user.addresses.id(addressId);

    if (!product || !selectedAddress) {
      req.flash("error", "Invalid product or address");
      return res.redirect("/shop");
    }
    const shippingFee = 49; 
    const totalAmount = product.price * quantity + shippingFee; // consistent shipping fee

    const order = await orderModel.create({
      user: req.user._id,
      products: [{ product: productId, quantity }],
      totalAmount,
       platformFee: 0,        
  shippingFee,  
      address: {
        fullname: user.fullname,
        address: selectedAddress.line1,
        city: selectedAddress.city,
        pincode: selectedAddress.pincode,
        state: selectedAddress.state
      },
      paymentMethod,
    });

      user.orders.push(order._id);
    await user.save();

    res.redirect(`/order-success/${order._id}`);
  } catch (err) {
    console.error("Place Order Error:", err);
    req.flash("error", "Something went wrong while placing order.");
    res.redirect("/shop");
  }
});

router.get("/order-success/:orderId", isLoggedIn, async (req, res) => {
  try {
    const order = await orderModel
      .findById(req.params.orderId)
      .populate("products.product");
    const user = await userModel.findById(order.user);

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);

    res.render("order-success", {
      fromOrderId: true,
      user,
      order,
      address: order.address, // ✅ fix added
      deliveryDate
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Order not found.");
  }
});



module.exports = router;
