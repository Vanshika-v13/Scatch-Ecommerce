const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");
const productModel = require("../models/product-model");

const CLOTHING_CATEGORIES = [
  "T-Shirt",
  "Shirt",
  "Jeans",
  "Tops",
  "Tees",
  "Bottom",
  "Dress",
];
const VALID_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const normalizeSize = (size) =>
  typeof size === "string" ? size.trim().toUpperCase() : "";

const isClothingProduct = (product) =>
  product && CLOTHING_CATEGORIES.includes(product.category);

router.get("/buynow/:productId", isLoggedIn, async (req, res) => {
  try {
    const product = await productModel.findById(req.params.productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/shop");
    }

    const requestedSize = normalizeSize(req.query.size);
    const needsSize = isClothingProduct(product);

    if (needsSize && !VALID_SIZES.includes(requestedSize)) {
      req.flash("error", "Please select a valid size before Buy Now.");
      return res.redirect("/shop");
    }

    const user = await userModel.findById(req.user._id);
    const defaultAddress =
      user.addresses.find((addr) => addr.isDefault) || user.addresses[0];

    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 5);

    res.render("buynow-checkout", {
      product,
      selectedSize: needsSize ? requestedSize : null,
      addresses: user.addresses,
      defaultAddressId: defaultAddress?._id?.toString(),
      arrivalDate: arrivalDate.toDateString(),
      user,
      success: req.flash("success"),
      error: req.flash("error"),
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
    const address = user.addresses.id(addressId);

    if (!product || !address) {
      req.flash("error", "Invalid product or address");
      return res.redirect("/shop");
    }

    const selectedSize = normalizeSize(req.body.size);
    if (isClothingProduct(product) && !VALID_SIZES.includes(selectedSize)) {
      req.flash("error", "Please select a valid size before continuing.");
      return res.redirect("/shop");
    }

    const qty = parseInt(quantity, 10);
    const discount = Number(product.discount || 0);
    const baseTotalPrice = product.price * qty;
    const discountAmount = +(baseTotalPrice * (discount / 100)).toFixed(2);
    const itemTotal = +(baseTotalPrice - discountAmount).toFixed(2);
    const shippingFee = 49;
    const total = +(itemTotal + shippingFee).toFixed(2);

    // Calculate arrival date = today + 5 days
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 5);

    res.render("buy-confirm", {
      product,
      quantity: qty,
      size: isClothingProduct(product) ? selectedSize : null,
      address,
      paymentMethod,
      shippingFee,
      total,
      price: itemTotal,
      discount,
      discountAmount,
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
    const { productId, addressId, paymentMethod } = req.body;
    const quantity = parseInt(req.body.quantity, 10);
    const user = await userModel.findById(req.user._id);
    const product = await productModel.findById(productId);
    const selectedAddress = user.addresses.id(addressId);
    const selectedSize = normalizeSize(req.body.size);

    if (!product || !selectedAddress) {
      req.flash("error", "Invalid product or address");
      return res.redirect("/shop");
    }

    if (isClothingProduct(product) && !VALID_SIZES.includes(selectedSize)) {
      req.flash("error", "Please select a valid size before placing order.");
      return res.redirect("/shop");
    }

    const discount = Number(product.discount || 0);
    const baseTotalPrice = product.price * quantity;
    const discountAmount = +(baseTotalPrice * (discount / 100)).toFixed(2);
    const priceAfterDiscount = +(baseTotalPrice - discountAmount).toFixed(2);
    const shippingFee = 49;
    const totalAmount = +(priceAfterDiscount + shippingFee).toFixed(2);

    const order = await orderModel.create({
      user: req.user._id,
      products: [
        {
          product: productId,
          quantity: quantity,
          price: priceAfterDiscount,
          size: isClothingProduct(product) ? selectedSize : null,
        },
      ],
      totalAmount,
      platformFee: 0,
      shippingFee,
      address: {
        fullname: user.fullname,
        address: selectedAddress.line1,
        city: selectedAddress.city,
        pincode: selectedAddress.pincode,
        state: selectedAddress.state,
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
      address: order.address,
      deliveryDate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Order not found.");
  }
});

module.exports = router;
