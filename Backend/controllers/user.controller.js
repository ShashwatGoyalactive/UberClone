const UserModel = require("../models/user.model.js");
const userServices = require("../services/user.service.js");
const { validationResult } = require("express-validator");

module.exports.registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { fullname, email, password } = req.body;
    const hashedPassword = await UserModel.hashedPassword(password);
    const user = await userServices.createUser({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email: email,
      password: hashedPassword,
    });

    const token = user.generateAuthToken();

    return res.status(201).json({ token, user });
  } catch (error) {
    console.log("Error encountered while registering the user", error);
  }
};


module.exports.loginUser = async(req, res, next) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(400).json({errors : errors.array()});
    }

    const {email , password} = req.body;

    const user = await UserModel.findOne({email}).select('+password'); // we are using +password by default in userSchema we have set select field of password as false

    if(!user){
      return res.status(401).json({message : 'Invalid email or password'});
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const token = user.generateAuthToken();

    return res.status(200).json({token , user});
  } catch (error) {
    console.log('Error encountered while logging the user ' ,  error);
  }

}
