const express = require('express');
const router = express.Router();
const {body , query} = require('express-validator');
const rideController = require('../controllers/ride.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

router.post('/create', 
    authMiddleware.authUser,
    body('pickup').isString().isLength({min: 3}).withMessage('Origin must be at least 3 characters long'),
    body('destination').isString().isLength({min: 3}).withMessage('Destination must be at least 3 characters long'),
    body('vehicleType').isIn(['car' , 'moto' , 'auto']).withMessage('Invalid vehicle type'),
    rideController.createRide
)

router.get('/get-fare' , authMiddleware.authUser ,
    query('pickup').isString().isLength({min: 3}).withMessage('Origin must be at least 3 characters long'),
    query('destination').isString().isLength({min: 3}).withMessage('Destination must be at least 3 characters long'),
    rideController.getFare);

    router.post('/confirm' , authMiddleware.authCaptain , 
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.confirmRide);
    
    router.get('/start-ride', authMiddleware.authCaptain ,
        query('rideId').isMongoId().withMessage('Invalid ride id'),
        query('otp').isString().isLength({min:6 , max:6}).withMessage('Invalid otp'),
        rideController.startRide
    )


    router.post('/-end-ride' , authMiddleware.authCaptain ,
        body('rideId').isMongoId().withMessage('Invalid ride id'),
        rideController.endRide
    )
module.exports = router;