const express = require('express');
const { validationResult } = require('express-validator');
const rideService = require('../services/ride.service.js');
const mapsService = require('../services/maps.service.js');
const {sendMessageToSocketId} = require('../socket.js');
const rideModel = require('../models/ride.model.js');

module.exports.createRide = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { pickup, destination, vehicleType } = req.body;
    try {
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });
         res.status(201).json(ride);

         const pickupCoordinates = await rideService.getAddressCoordinates(pickup);
         console.log(pickupCoordinates);
         
        const captainsInRadius = await rideService.getCaptainsInRadius(pickupCoordinates.ltd, pickupCoordinates.lng , 5000);

        ride.otp= "";
        
        const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');
        console.log(rideWithUser);

          captainsInRadius.map(async (captain) => {
            console.log(captain , ride);
            
            sendMessageToSocketId(captain.socketId, {
                event: 'new-ride',
                data: rideWithUser
            })    
    })

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}


module.exports.getFare = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination, vehicleType } = req.body;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);

    } catch (error) {
        console.log(error.message);
        return res.status(400).json({ message: error.message });
    }


}

module.exports.confirmRide = async (req, res, next)=> {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()});
    }

    const {rideId} = req.body;

    try {
        const ride = await rideService.confirmRide({rideId,captain: req.captain._id});

        sendMessageToSocketId(ride.captain.socketId, {
            event: 'ride-confirmed',
            data: ride
        });


        return res.status(200).json(ride);
    } catch (error) {
        console.log(error.message);
        return res.status(400).json({message : error.message});
    }
}


module.exports.startRide = async (req, res, next)=> {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()});
    }

    const {rideId, otp} = req.body;

    try {
        const ride = await rideService.startRide({rideId: rideId , captain : req.captain , otp});
        sendMessageToSocketId(ride.captain.socketId, {
            event: 'ride-started',
            data: ride
        });
        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        });
        return res.status(200).json(ride);
    } catch (error) {
        console.log(error.message);
        return res.status(400).json({message : error.message});
    }
}

module.exports.endRide = async (req, res, next)=> {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()});
    }

    const {rideId} = req.body;

    try {
        const ride = (await rideService.endRide({rideId, captain : req.captain}));
        
        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-ended',
            data: ride
        });
       
        return res.status(200).json(ride);
    } catch (error) {
        console.log(error.message);
        return res.status(400).json({message : error.message});
    }
}