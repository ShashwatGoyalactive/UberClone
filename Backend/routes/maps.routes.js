const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware.js');
const mapController = require('../controllers/maps.controller.js');
const { query } = require('express-validator');


router.get('/get-coordinates',
    query('address').isString().isLength({ min: 3 }).withMessage('Address must be at least 3 characters long'),
    authMiddleware.authUser,
    mapController.getCordinates);

router.get('/get-distance-time',
    query('origin').isString().isLength({ min: 3 }).withMessage('Origin must be at least 3 characters long'),
    query('destination').isString().isLength({ min: 3 }).withMessage('Destination must be at least 3 characters long'),
    authMiddleware.authUser,
    mapController.getDistanceTime);

router.get('/get-suggestions',
    query('input').isString().isLength({min:3}),
    authMiddleware.authUser,
    mapController.getAutoCompleteSuggestions
)


module.exports = router;