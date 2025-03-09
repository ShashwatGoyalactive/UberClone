const captainModel = require('../models/captain.model.js');


module.exports.createCaptain = async ({firstname , lastname, email, password , color , plate , capacity, vehicleType})=> {
    try{
        if(!firstname || !lastname || !email || !password || !color || !plate || !capacity || !vehicleType){
            throw new Error('All fields are required');
        }
        const captain = await captainModel.create({
            fullname:{
                firstname,
                lastname,
            },
            email, 
            password,
            vehicle: {
                color,
                plate,
                capacity,
                vehicleType
            }
        })

        return captain;
    }catch (err){
        console.log('Error encountered while creating the captain' , err);
        
    }
}