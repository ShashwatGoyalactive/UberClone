const captionModel = require('../models/captain.model.js');
const captainService = require('../services/captain.service.js');
const { validationResult } = require('express-validator');
const BlacklistTokenModel = require('../models/blacklistToken.model.js');
module.exports.registerCaptian = async (req, res, next) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { fullname, email, password, vehicle } = req.body;

        const isCaptionAlreadyExist = await captionModel.findOne({ email });
        if (isCaptionAlreadyExist) {
            return res.status(400).json({ message: 'Captain already exist' });
        }


        const hashedPassword = await captionModel.hashedPassword(password);
        const captain = await captainService.createCaptain({
            firstname: fullname.firstname,
            lastname: fullname.lastname,
            email,
            password: hashedPassword,
            color: vehicle.color,
            plate: vehicle.plate,
            capacity: vehicle.capacity,
            vehicleType: vehicle.vehicleType,
        })
        const token = captain.generateAuthToken();

        return res.status(201).json({ token, captain });
    } catch (error) {
        console.log('Error encountered while creating the captain', error);
    }
};


module.exports.loginCaptain = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const captain = await captionModel.findOne({ email }).select('+password');
        if (!captain) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await captain.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = captain.generateAuthToken();

        return res
            .status(200)
            .cookie('token', token)
            .json({ token, captain });

    } catch (err) {
        console.log('Error encountered while logging in the captain', err);

    }
}

module.exports.getCaptainProfile = async (req, res, next) => {
    try {
        return res.status(200).json({ captain: req.captain });
    } catch (error) {
        console.log('Error encountered while fetching profile data ..', error);

    }
}


module.exports.logoutCaptain = async (req, res, next) => {
    try {

        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await BlacklistTokenModel.create({ token });

        return res.status(200).json({ message: 'Logout successful' });


    } catch (error) {
        console.log('Error while logging out captain ...', error);

    }
}