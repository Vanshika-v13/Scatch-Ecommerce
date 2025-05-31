const mongoose=require("mongoose");


const userSchema=mongoose.Schema({
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
    cart:{
        type:Array,
        default:[],
    },
    isAdmin:{
        type:Boolean,
    },
    order:{
        type:Array,
        default:[],
    },
    contact:{
        type:Number,
    },
    picture:{
        type:String,
    }



});

const User=mongoose.model("user",userSchema);
module.exports=User;