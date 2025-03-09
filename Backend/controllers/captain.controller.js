const captionModel = require('../models/captain.model.js');
const captainService = require('../services/captain.service.js');
const {validationResult} = require('express-validator');
module.exports.registerCaptian = async (req, res, next) => {
    try {

        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors : errors.array()});
        }
        const {fullname , email, password , vehicle} = req.body;

        const isCaptionAlreadyExist = await captionModel.findOne({email});
        if(isCaptionAlreadyExist){
            return res.status(400).json({message : 'Captain already exist'});
        }


        const hashedPassword = await captionModel.hashedPassword(password); 
        const captain = await captainService.createCaptain({
            firstname : fullname.firstname,
            lastname: fullname.lastname,
            email,
            password : hashedPassword,
            color:  vehicle.color,
            plate: vehicle.plate,
            capacity : vehicle.capacity,
            vehicleType: vehicle.vehicleType,
        })
        const token = captain.generateAuthToken();

        return res.status(201).json({token , captain});
    } catch (error) {
        console.log('Error encountered while creating the captain' , error);
    }
};

