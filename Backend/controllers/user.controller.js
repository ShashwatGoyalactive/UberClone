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
