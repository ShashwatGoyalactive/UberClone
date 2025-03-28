const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const app = express();
const connectToDb = require('./db/db.js');
const userRoutes  = require('./routes/user.routes.js');
const captionRoutes = require('./routes/captain.routes.js');
const rideRoutes = require('./routes/ride.routes.js');
const cookieParser = require('cookie-parser');
const mapRoutes = require('./routes/maps.routes.js');
connectToDb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cookieParser());



app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.use('/users' , userRoutes);
app.use('/captains' , captionRoutes);
app.use('/maps' , mapRoutes);
app.use('/rides' , rideRoutes);

module.exports = app;