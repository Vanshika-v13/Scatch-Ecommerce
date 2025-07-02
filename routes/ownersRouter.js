const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const ownerModel = require("../models/owner-model");
const isOwner = require("../middlewares/isOwner");


// Create owner (only in dev)
if (process.env.NODE_ENV === "development") {
  router.post("/create", async (req, res) => {
    try {
      const owners = await ownerModel.find();
      if (owners.length > 0) {
        return res.status(403).send("❌ You don't have permission to create a new owner.");
      }

      const { fullname, email, password } = req.body;

      if (!fullname || !email || !password) {
        return res.status(400).send("All fields are required.");
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const createdOwner = await ownerModel.create({
        fullname,
        email,
        password: hashedPassword,
      });

      return res.status(201).send(createdOwner);
    } catch (err) {
      console.error("Error creating owner:", err);
      return res.status(500).send("Server error");
    }
  });
}




router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const owner = await ownerModel.findOne({ email });
  if (!owner) {
    req.flash("error", "Owner not found.");
    return res.redirect("/owners/login");
  }

  const isMatch = await bcrypt.compare(password, owner.password);
  if (!isMatch) {
    req.flash("error", "Invalid password.");
    return res.redirect("/owners/login");
  }

  
  req.session.user = {
    _id: owner._id,
    email: owner.email,
    role: "owner"
  };

  req.flash("success", "Logged in successfully.");
  res.redirect("/owners/admin");
});


// Owner login
router.get("/login", (req, res) => {
  const error = req.flash("error");
  const success = req.flash("success");
  res.render("owner-login", { error, success
   
   });
});


// Admin panel (protected)
router.get("/admin", isOwner, (req, res) => {
  const success = req.flash("success");
  res.render("createProduct", { success });
});


// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/owners/login");
  });
});

module.exports = router;
