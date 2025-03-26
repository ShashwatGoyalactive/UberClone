const express = require('express');
const { validationResult } = require('express-validator');
const rideService = require('../services/ride.service.js');

module.exports.createRide = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { pickup, destination, vehicleType } = req.body;
    try {
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });
        return res.status(201).json(ride);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}


module.exports.getFare = async (req, res, next) => {
    const errors = validateResult(req);
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