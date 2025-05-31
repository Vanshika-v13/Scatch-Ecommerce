
const mongoose=require("mongoose");


mongoose
.connect("mongodb://127.0.0.1:27017/")
.then(()=>{
console.log("connected to mongoDb");
}).catch((err)=>{
    console.log(err);
});

module.exports=mongoose.connection;