const express=require("express");
const router=express.Router();

const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel=require("../models/product-model");
const userModel=require("../models/user-model");
const multer = require("multer");

const upload = multer({ dest: "public/uploads/" });
const bcrypt = require("bcrypt");

// GET route – Show Change Password form
router.get("/changepassword", isLoggedIn, (req, res) => {
  res.render("change-password", { error: req.flash("error"), success: req.flash("success") });
});

// POST route – Update password
router.post("/changepassword", isLoggedIn, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await userModel.findById(req.user._id);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    req.flash("error", "Current password is incorrect.");
    return res.redirect("/account/changepassword");
  }

  if (newPassword !== confirmPassword) {
    req.flash("error", "New passwords do not match.");
    return res.redirect("/account/changepassword");
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  user.password = hashed;
  await user.save();

  req.flash("success", "Password changed successfully.");
  res.redirect("/account");
});



router.get("/", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);
  const success = req.flash("success");
res.render("account", { user, success });
});




router.get("/edit", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);
  res.render("edit-profile", { user });
});

router.post("/edit", isLoggedIn, upload.single("avatar"), async (req, res) => {
  const { fullname, phone } = req.body;

  const updatedData = {
    fullname,
    phone
  };

  if (req.file) {
    updatedData.picture = `/uploads/${req.file.filename}`;
  }

  await userModel.findByIdAndUpdate(req.user._id, updatedData);
  req.flash("success", "Profile updated successfully.");
  res.redirect("/account");
});


router.post("/addresses/new", isLoggedIn, async (req, res) => {
  const { line1, city, state, pincode, redirectTo } = req.body;

  await userModel.findByIdAndUpdate(req.user._id, {
    $push: {
      addresses: { line1, city, state, pincode }
    }
  });

  res.redirect(redirectTo || "/account");
});


router.get("/addresses/new", isLoggedIn, (req, res) => {
  const redirectTo = req.query.redirect || "/account"; // default
  res.render("new-address", { redirectTo });
});



router.post("/addresses/edit/:id", isLoggedIn, async (req, res) => {
  const { line1, city, state, pincode } = req.body;
  const user = await userModel.findById(req.user._id);
  const address = user.addresses.id(req.params.id);
  address.set({ line1, city, state, pincode });
  await user.save();
  res.redirect("/account");
});

router.get("/addresses/edit/:id", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);

  const address = user.addresses.id(req.params.id);
  if (!address) {
    req.flash("error", "Address not found.");
    return res.redirect("/account");
  }

  res.render("edit-address", { address });
});


router.get('/addresses/default/:id', isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);

  user.addresses.forEach(addr => {
    addr.isDefault = false;
  });

  
  const selectedAddress = user.addresses.id(req.params.id);
  if (!selectedAddress) {
    req.flash('error', 'Address not found');
    return res.redirect('/account');
  }

  selectedAddress.isDefault = true;
  await user.save();

  req.flash('success', 'Default address updated.');
  res.redirect('/account');
});


router.get("/addresses/delete/:id", isLoggedIn, async (req, res) => {
  await userModel.findByIdAndUpdate(req.user._id, {
    $pull: { addresses: { _id: req.params.id } }
  });
  res.redirect("/account");
});

module.exports=router;