const express = require('express');
const router = express.Router();
const {body} = require('express-validator');
const rideController = require('../controllers/ride.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

router.post('/create', 
    authMiddleware.authUser,
    body('pickup').isString().isLength({min: 3}).withMessage('Origin must be at least 3 characters long'),
    body('destination').isString().isLength({min: 3}).withMessage('Destination must be at least 3 characters long'),
    body('vehicleType').isIn(['car' , 'moto' , 'auto']).withMessage('Invalid vehicle type'),
    rideController.createRide
)



module.exports = router;