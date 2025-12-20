// Socket.io

import { Server } from 'socket.io';

const io = new Server(5100,{
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

console.log("Servidor de Socket.io escuchando en el puerto 5000");

export { io };