// for performing database related services for the user 
const userModel = require('../models/user.model.js');



module.exports.createUser = async ({ firstname, lastname, email, password }) => {


  try {
    if (!firstname || !email || !password) {
      throw new Error('All fields are required');
    }

    const user = userModel.create({
      fullname: {
        firstname,
        lastname
      },
      email,
      password
    })

    return user;
  } catch (error) {
    console.log('User creation failed!', error);

  }

}


