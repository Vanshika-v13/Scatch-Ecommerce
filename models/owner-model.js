const mongoose=require("mongoose");



const ownerSchema=mongoose.Schema({
    fullname:{
        type:String,
        minLength:3,
        trim:true,
    },
    email:{
        type:String,
    },
    password:{
        type:String,
    },
   
   
    product:{
        type:Array,
        default:[],
    },
   
    picture:{
        type:String,
    },
    gstin:String,



});

const Owner=mongoose.model("owner",ownerSchema);
module.exports=Owner;