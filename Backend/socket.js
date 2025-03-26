const socketIo = require('socket.io');
const userModel = requrie('../models/user.model');
const captainModel = require('../models/captain.model');

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
    })

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
    });
});

}


function sendMessageToSocketId(socketId, message) {
    if(io){
        io.to(socketId).emit('message' , message);
    }else {
        console.log('Socket is not initialized');
    }
}

module.exports = {initializeSocket , sendMessageToSocketId};