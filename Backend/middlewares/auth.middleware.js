const UserModel = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const BlacklistTokenModel = require('../models/blacklistToken.model.js');
const CaptainModel = require('../models/captain.model.js');

module.exports.authUser = async(req, res, next)=> {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if(!token){
        return res.status(401).json({message : 'Unauthorized'});
    }

    const isBlacklisted = await BlacklistTokenModel.findOne({token :token});
    if(isBlacklisted){
        return res.status(401).json({message : 'Unauthorized access!'});
    }

try {
    const decoded = jwt.verify(token , process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded._id);
    
    req.user = user;

    return next();
} catch (error) {
    return res.status(401).json({message : 'Unauthorized access!'});
}

}

module.exports.authCaptain = async(req, res, next)=> {
   const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if(!token){
            return res.status(401).json({message : 'Unauthorized'});
        }  
        const isBlacklisted = await BlacklistTokenModel.findOne({token :token});
        if(isBlacklisted){
            return res.status(401).json({message : 'Unauthorized access!'});
        }

        try {
       

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const captain = await CaptainModel.findById(decoded._id);
        if (!captain) {
            return res.status(401).json({ message: 'Unauthorized' });
        }   

        req.captain = captain;
        return next();

    } catch (error) {
        console.log('Error encountered while authenticating the captain' , error);   
    }
}