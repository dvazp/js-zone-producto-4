// Socket.io

import { Server } from 'socket.io';

const io = new Server(5000);

io.on('connection', (socket) => {
  socket.emit("PruebaSocket", "Hola desde el servidor");
  socket.on("PruebaSocket", (arg) => {
      console.log(arg);
  }); 
});

console.log("Servidor de Socket.io escuchando en el puerto 5000"); 