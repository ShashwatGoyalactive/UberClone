const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'First name must be at least 3 characters or long']
        },
        lastname: {
            type: String,
            minlength: [3, 'First name must be at least 3 characters or long']
        },
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: [5, 'Email must be at least 5 character long'],
    },
    password: {
        type: String,
        required: true,
        // property for not sending password when searching for user 
        select: false,
    },
    socketId: {
        type: String,
        select: false,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive',
    },
    vehicle : {
        color: {
            type: String,
            required : true,
            minlength: [3, 'Color must be at least 3 characters or long'],
        },
        plate: {
            type: String,
            required: true,
            minlength: [3, 'Plate must be at least 3 characters or long'],
        },
        capacity : {
            type: Number,
            required: true,
            min: [1, 'Capacity must be at least 1 person'],
        },
        vehicleType: {
            type: String,
            required: true,
            enum : ['car' , 'motorcycle' , 'auto'],
        }
    },
    location :{
        lat: {
            type: Number,
        },
        lng: {
            type: Number,
        }
    },

} , { timestamps: true})

captainSchema.methods.generateAuthToken = function (){
const token = jwt.sign({_id: this._id} , process.env.JWT_SECRET, {expiresIn : '24h'});
return token;
}

captainSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

captainSchema.statics.hashedPassword = async function(password){
    return await bcrypt.hash(password , 10);
}


const CaptainModel = mongoose.model('captain' , captainSchema);

module.exports = CaptainModel;