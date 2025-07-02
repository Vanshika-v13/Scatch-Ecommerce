const userModel=require("../models/user-model");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const {generateToken}=require("../utils/generateToken");
const Product = require("../models/product-model");



module.exports.registerUser = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      req.flash("error", "All fields are required.");
      return res.redirect("/");
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      req.flash("error", "You already have an account. Please login.");
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

    req.flash("success", "Account created successfully. Please login.");
    
     return res.redirect("/");
    // res.redirect("/show-success");

  } catch (error) {
    console.error("Registration Error:", error);
    req.flash("error", "Something went wrong during registration.");
    return res.redirect("/");
  }
};


module.exports.loginUser=async(req,res)=>{
const {email,password}=req.body;
const user=await userModel.findOne({email:email});
if(!user){
    req.flash("error","email or password incorrect");
    return  res.redirect("/");
}
bcrypt.compare(password,user.password, async function(err, result){
if(result){
    const token=generateToken(user);
    res.cookie("token",token);
   try {
        const products = await Product.find(); 
       const success = req.flash("success");
const error = req.flash("error");
res.redirect("/shop") ;  
      } catch (error) {
        res.status(500).send("Error loading products: " + error.message);
      }
}else{ 
    req.flash("error","email or password incorrect");
    return  res.redirect("/");
}

});
}


module.exports.logoutUser=function(req,res){
 res.clearCookie("token");
res.redirect("/");
};
