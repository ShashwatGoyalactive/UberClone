const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const crypto = require('crypto');
async function getFare(pickup, destination) {
    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }
    try {

        const distanceTime = await mapService.getDistanceTime(pickup, destination);

        if (!distanceTime) {
            throw new Error('Unable to fetch distance and time');
        }

        const baseFare = {
            auto: 30,
            car: 50,
            moto: 20
        };

        const perKmRate = {
            auto: 10,
            car: 15,
            moto: 8
        };

        const perMinRate = {
            auto: 2,
            car: 3,
            moto: 1
        };

        console.log(distanceTime);
        const fare = {
            auto: Math.round( baseFare.auto + (distanceTime.distance.value/1000 * perKmRate.auto) + (distanceTime.duration.value/60 * perMinRate.auto)),
            car: Math.round(baseFare.car + (distanceTime.distance.value / 1000 * perKmRate.car) + (distanceTime.duration.value / 60 * perMinRate.car)),
            moto: Math.round( baseFare.moto + (distanceTime.distance.value / 1000 * perKmRate.moto) + (distanceTime.duration.value / 60 * perMinRate.moto))
        }
        console.log(fare);
        
        return fare;
    }
    catch (error) {
        console.log('Error encountered while fetching fare ..', error);
        resizeBy.sendStatus(500).json({ message: 'Internal server error' });
    }
}

function getOTP (num){
    const otp = crypto.randomInt(Math.pow(10, num-1), Math.pow(10,num)).toString();
    return otp;
}

module.exports.createRide = async ({ user, pickup, destination, vehicleType }) => {

    if(!user || !pickup || !destination || !vehicleType){
        throw new Error('All fields are required');
    }

    try{
        const fare = await getFare(pickup, destination);

        const newRide = await rideModel.create({
            user,
            pickup,
            destination,
            fare : fare[vehicleType],
            otp : getOTP(6),
           
        });

        return newRide;
        } catch (error) {
        console.log('Error encountered while creating the ride' , error);
        
    }

}


