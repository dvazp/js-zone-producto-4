import { Server } from 'socket.io';

let io;

function inicializarSocket(server) {
  io = new Server(server, {
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

  console.log("Socket.io inicializado");
  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado");
  }
  return io;
}

export { inicializarSocket, getIO };