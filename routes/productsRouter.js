const express=require("express");

const router=express.Router();
const upload=require("../config/multer-config");
const productModel=require("../models/product-model");

router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;

    if (!req.file) {
      req.flash("error", "Image is required.");
      return res.redirect("/owners/admin");
    }

    const product = await productModel.create({
      image: `/images/uploads/${req.file.filename}`, // Save path
      name,
      price,
      discount,
      bgcolor,
      panelcolor,
      textcolor,
      platformFee,      
    shippingFee,
    });

  
    req.flash("success", "Product created successfully");
    res.redirect("/owners/admin");
  } catch (err) {
    console.error("Product creation error:", err);
    req.flash("error", "Failed to create product.");
    res.redirect("/owners/admin");
  }
});




module.exports=router;