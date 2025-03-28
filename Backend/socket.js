const socketIo = require('socket.io');
const userModel = require('./models/user.model.js');
const captainModel = require('./models/captain.model.js');

let io;

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });


io.on('connection' , (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    socket.on('join' , async  (socket) => {
        const {userId, userType } = socket;
        
        if(userType === 'user'){
            await userModel.findByIdAndUpdate(userId, {socketId: socket.id});
        }else{
            await captainModel.findByIdAndUpdate(userId, {socketId: socket.id});
        }
    });

//  data contains ltd, lng , token
    socket.on('update-location-captain', async (data)=> {
        const {userId, location} = data;
        if ( !location || !location.lat || !location.lng) {
           return socket.emit('error', {message: 'Invalid location data'});
        }
        await captainModel.findByIdAndUpdate(userId, {location: {
            ltd: location.ltd,
            lng: location.lng,
        }});
    })

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
    });
});

}


function sendMessageToSocketId(socketId, messageObject) {
    console.log(`Sending message to ${socketId}`, messageObject)
    if(io){
        io.to(socketId).emit(messageObject.event , messageObject.data);
    }else {
        console.log('Socket is not initialized');
    }
}

module.exports = {initializeSocket , sendMessageToSocketId};