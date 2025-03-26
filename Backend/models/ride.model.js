const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Captain',
    },
    pickup: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    fare: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['accepted', 'rejected', 'ongoing', 'pending', 'completed'],
        default: 'pending',
    },
    duration: {
        type: Number,
    }, // in seconds
    distance: {
        type: Number,
    }, // in meters
    paymentID: {
        type: String,
    },
    orderId: {
        type: String,
    },
    signature: {
        type: String,
    },
    otp: {
        type:String,
        select: false, // by default select is set as false so that the otp is sent to user only and not the captain
        required : true,
    }
}, { timestamps: true });



const Ride = mongoose.model('Ride', rideSchema);
module.exports = Ride;