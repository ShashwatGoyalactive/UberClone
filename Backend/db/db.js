const mongoose = require('mongoose');
async function connectToDb() {
    try {
        await mongoose.connect(process.env.DB_CONNECT);
        console.log('Connected to DB');
    } catch (err) {
        console.error('Error connecting to DB:', err);
    }
}

module.exports = connectToDb;

