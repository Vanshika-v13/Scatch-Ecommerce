const express=require("express");
const router=express.Router();

const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel=require("../models/product-model");
const userModel=require("../models/user-model");
const orderModel=require("../models/order-model");

router.get("/myorders", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate({
      path: "orders",
      populate: {
        path: "products.product"
      }
    });

    res.render("myorders", {
      user,
      orders: user.orders,
      success: req.flash("success"),
      error: req.flash("error")
    });
  } catch (err) {
    console.error("Error loading orders:", err);
    req.flash("error", "Failed to load orders.");
    res.redirect("/");
  }
});

router.post("/cancel-order/:orderId", isLoggedIn, async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.orderId);

    if (!order || order.user.toString() !== req.user._id.toString()) {
      req.flash("error", "Order not found or unauthorized.");
      return res.redirect("/myorders");
    }

    // Disallow if already delivered
    if (order.status === "Delivered") {
      req.flash("error", "Delivered orders cannot be cancelled.");
      return res.redirect("/myorders");
    }

    // ✅ Disallow cancellation if more than 24 hours passed
    const now = new Date();
    const placedAt = new Date(order.createdAt);
    const timeDiff = (now - placedAt) / (1000 * 60 * 60); // in hours

    if (timeDiff > 24) {
      req.flash("error", "You can only cancel orders within 24 hours.");
      return res.redirect("/myorders");
    }

    // Mark as cancelled
    order.status = "Cancelled";
    await order.save();

    req.flash("success", "Order cancelled successfully.");
    res.redirect("/myorders");
  } catch (err) {
    console.error("Cancel order error:", err);
    req.flash("error", "Failed to cancel order.");
    res.redirect("/myorders");
  }
});

 
module.exports=router;