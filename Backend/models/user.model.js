const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new  mongoose.Schema(
    {
        fullname : {
            firstname :{
                type:String,
                required: true,
                minlength:[3, 'First name must be at least 3 characters or long']
            },
            lastname: {
                type: String,
                minlength: [3, 'First name must be at least 3 characters or long']
            },
        },
        email:{
            type:String,
            required: true,
            unique : true,
            minlength : [5, 'Email must be at least 5 character long'],
        },
        password: {
            type: String,
            required: true,
            // property for not sending password when searching for user 
            select: false,
        },
        socketId : {
            // for tracking the live location of captain for sharing with the user 
            type: String,
        }

    } , {timestamps: true});

    userSchema.methods.generateAuthToken = function(){
        const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return token;
    }

    userSchema.methods.comparePassword = async function(password){
        return await bcrypt.compare(password , this.password);
    }

    userSchema.statics.hashedPassword = async function (password) {
        return await bcrypt.hash(password,10);
    }

    const UserModel = mongoose.model('user' , userSchema);

    module.exports = UserModel;

    