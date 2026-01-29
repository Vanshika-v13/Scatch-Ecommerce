const express = require("express");

const router = express.Router();
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");

router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;

    if (!req.file) {
      req.flash("error", "Image is required.");
      return res.redirect("/owners/admin");
    }

    const numericPrice = Number(price);
    const numericDiscount = Number(discount) || 0;

    if (isNaN(numericPrice)) {
      req.flash("error", "Price must be a valid number.");
      return res.redirect("/owners/admin");
    }

    const product = await productModel.create({
      image: `/images/uploads/${req.file.filename}`,
      name,
      price: numericPrice,
      discount: numericDiscount,
      bgcolor,
      panelcolor,
      textcolor,
    });

    req.flash("success", "Product created successfully");
    res.redirect("/owners/admin");
  } catch (err) {
    console.error("Product creation error:", err);
    req.flash("error", "Failed to create product.");
    res.redirect("/owners/admin");
  }
});

module.exports = router;
