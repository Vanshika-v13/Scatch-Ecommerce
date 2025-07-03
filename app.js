require("dotenv").config();
const express=require("express");
const app=express();
const PORT= process.env.PORT;
const cookieParser=require("cookie-parser");
const mongoose=require("mongoose");
const path =require("path");
const ownersRouter=require("./routes/ownersRouter");
const usersRouter=require("./routes/usersRouter");
const productsRouter=require("./routes/productsRouter");
const accountRouter=require("./routes/accountsRouter");
const index=require("./routes/index");
const expressSession=require("express-session");
const flash=require("connect-flash");
const buyRoute=require("./routes/buyProduct");
const orderRouter = require("./routes/orderRouter");
const myOrderRouter=require("./routes/myOrders");
const adminOrderRouter=require("./routes/adminOrderRouter");

mongoose
.connect(process.env.MONGODB_URI)
.then(()=>{
   console.log("connected to mongoDb");
}).catch((err)=>{
    console.log(err);
});




app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(
    expressSession({
        resave:false,
        saveUninitialized:false,
        secret:process.env.EXPRESS_SESSION_SECRET,
    })
);
app.use(flash());
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.use(express.static(path.join(__dirname,"public")));
app.set("view engine","ejs");

app.use("/owners",ownersRouter);
app.use("/users",usersRouter);
app.use("/products",productsRouter);
app.use("/",index);
app.use("/account",accountRouter);
app.use("/",buyRoute);
app.use("/", orderRouter);
app.use("/",myOrderRouter);
app.use("/",adminOrderRouter);

app.listen(PORT,()=>{
 console.log(`Server on listening on port ${PORT}`);
});