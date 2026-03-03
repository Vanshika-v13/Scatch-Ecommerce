const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");
const Product = require("../models/product-model");

module.exports.registerUser = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      req.flash("registerError", "All fields are required.");
      return res.redirect("/");
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      req.flash("registerError", "You already have an account. Please login.");
      return res.redirect("/");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({
      fullname: fullname.trim(),
      email: email.trim(),
      password: hashedPassword,
    });

    const token = generateToken(newUser);
    res.cookie("token", token);

    req.flash("success", "Account created successfully.");

    return res.redirect("/");
    // res.redirect("/show-success");
  } catch (error) {
    console.error("Registration Error:", error);
    req.flash("registerError", "Something went wrong during registration.");
    return res.redirect("/");
  }
};

module.exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email: email });
  if (!user) {
    req.flash("loginError", "email or password incorrect");
    return res.redirect("/");
  }
  if (user.isBlocked) {
    req.flash("loginError", "Your account has been blocked by admin.");
    return res.redirect("/");
  }
  bcrypt.compare(password, user.password, async function (err, result) {
    if (result) {
      const token = generateToken(user);
      res.cookie("token", token);
      return res.redirect("/");
    } else {
      req.flash("loginError", "email or password incorrect");
      return res.redirect("/");
    }
  });
};

module.exports.logoutUser = function (req, res) {
  res.clearCookie("token");
  res.redirect("/");
};
