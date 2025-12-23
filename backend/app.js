// Importamos Express, el framework para crear el servidor
import express from 'express';
import https from 'https';
import fs from 'fs';
import mongoose from 'mongoose';
import fsPromises from 'fs/promises';
import crearLoginRoute from "./routes/login.js";
import { inicializarSocket, getIO } from './socket.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Usuario, Voluntariado, Seleccionado } from './mongoose.js';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import path from 'path';
import { fileURLToPath } from 'url';

// Definimos el puerto donde correrá el servidor (3000 por defecto)
const PORT = process.env.PORT || 3000;

// Creamos la aplicación Express
const app = express();

// Cargamos HTTPS
const credenciales ={

  key: fs.readFileSync('../certs/server.key'),
  cert: fs.readFileSync('../certs/server.cert')
};


const server = https.createServer(credenciales, app);
inicializarSocket(server);



app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

// Conexión MongoDB con Mongoose
const MONGO_URI = 'mongodb://127.0.0.1:27017/jszone';
const archivoDatos = '../frontend/js/datos.json';

async function conectarMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado a MongoDB con Mongoose");

    const contenidoJson = await fsPromises.readFile(archivoDatos, 'utf-8');
    const datos = JSON.parse(contenidoJson);

    // Inicialización de usuarios
    const contadorUsuarios = await Usuario.countDocuments();
    if (contadorUsuarios === 0) {
      await Usuario.insertMany(datos.usuariosBase);
      console.log("Inicializando Usuarios");
    } else {
      console.log("Los usuarios ya se han inicializado");
    }

    // Inicialización de voluntariados
    const contadorVoluntariados = await Voluntariado.countDocuments();
    if (contadorVoluntariados === 0) {
      await Voluntariado.insertMany(datos.voluntariadosBase);
      console.log("Inicializando voluntariados");
    } else {
      console.log("Ya hay voluntariados insertados");
    }

    // Configurar ruta de login
    app.use("/login", crearLoginRoute(Usuario));

  } catch (error) {
    console.error("Error al conectar con MongoDB:", error);
    process.exit(1);
  }
}

await conectarMongo();

// Eventos de socket para login
try {
  const ioServer = getIO();
  ioServer.on('connection', (socket) => {
    socket.on('login', async (data, callback) => {
      try {
        const { user, password } = data || {};
        const usuario = await Usuario.findOne({
          $or: [
            { user: { $regex: `^${user}$`, $options: 'i' } },
            { email: { $regex: `^${user}$`, $options: 'i' } }
          ]
        });

        if (!usuario) {
          return callback?.({ success: false, message: 'Usuario no encontrado' });
        }
        if (usuario.password !== password) {
          return callback?.({ success: false, message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
          { id: usuario._id, user: usuario.user, tipo: usuario.tipo },
          'secreto-super-seguro',
          { expiresIn: '1h' }
        );
        callback?.({ 
          success: true, 
          token, 
          usuario: { user: usuario.user, email: usuario.email, tipo: usuario.tipo } 
        });
      } catch (err) {
        console.error('Error manejando login socket:', err);
        callback?.({ success: false, message: 'Error en servidor' });
      }
    });
  });
} catch (e) {
  console.error('No se pudo añadir handler de sockets para login:', e);
}

// ========================================
// RUTAS REST
// ========================================
// --- CONFIGURACIÓN DE RUTAS Y ESTÁTICOS ---
// --- Usuarios ---
app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
});

app.get('/usuarios/:email', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ email: req.params.email });
    if (usuario) {
      res.json(usuario);
    } else {
      res.status(404).json({ message: 'Este usuario no existe' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error buscando usuario' });
  }
});

app.post('/usuarios', async (req, res) => {
  try {
    const nuevoUsuario = new Usuario(req.body);
    await nuevoUsuario.save();
    res.status(201).json({ message: 'Usuario creado con éxito' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Este usuario ya existe' });
    }
    console.error(err);
    res.status(500).json({ message: 'Error creando usuario' });
  }
});

app.delete('/usuarios/:email', async (req, res) => {
  try {
    const result = await Usuario.deleteOne({ email: req.params.email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando usuario' });
  }
});

// --- Voluntariados ---
app.get('/voluntariados', async (req, res) => {
  try {
    const voluntariados = await Voluntariado.find();
    res.json(voluntariados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo voluntariados' });
  }
});

app.post('/voluntariados', async (req, res) => {
  try {
    const nuevoVoluntariado = new Voluntariado(req.body);
    await nuevoVoluntariado.save();
    
    getIO().emit('voluntariado:nuevo', nuevoVoluntariado);
    res.status(201).json({ message: 'Voluntariado creado con éxito', insertedId: nuevoVoluntariado._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creando voluntariado' });
  }
});

app.delete('/voluntariados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de voluntariado inválido' });
    }

    const result = await Voluntariado.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Voluntariado no encontrado' });
    }

    await Seleccionado.deleteOne({ voluntariadoId: id });
    getIO().emit('voluntariado:eliminado', { id });

    res.json({ message: 'Voluntariado eliminado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando voluntariado' });
  }
});

// --- Seleccionados ---
app.get('/seleccionados', async (req, res) => {
  try {
    const seleccionados = await Seleccionado.find();
    const ids = seleccionados.map(item => item.voluntariadoId);
    res.json(ids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo seleccionados' });
  }
});

app.post('/seleccionados', async (req, res) => {
  try {
    const { voluntariadoId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(voluntariadoId)) {
      return res.status(400).json({ message: 'ID de voluntariado inválido' });
    }

    await Seleccionado.findOneAndUpdate(
      { voluntariadoId },
      { voluntariadoId },
      { upsert: true, new: true }
    );

    getIO().emit('seleccionado:agregado', { voluntariadoId });
    res.status(201).json({ message: 'Seleccionado agregado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error agregando seleccionado' });
  }
});

app.delete('/seleccionados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Seleccionado.deleteOne({ voluntariadoId: id });
    
    getIO().emit('seleccionado:eliminado', { voluntariadoId: id });
    res.json({ message: 'Seleccionado eliminado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando seleccionado' });
  }
});

// ========================================
// GRAPHQL CON APOLLO SERVER
// ========================================



const typeDefs = `
  type Usuario {
    _id: ID!
    user: String!
    email: String!
    password: String!
    nombre: String!
    tipo: String!
  }

  type UsuarioPublic {
    user: String!
    email: String!
    tipo: String!
  }

  type AuthPayload {
    token: String!
    usuario: UsuarioPublic!
  }

  enum TipoVoluntariado {
    Oferta
    Peticion
  }

  scalar Date

  type Voluntariado {
    _id: ID!
    titulo: String!
    usuario: String!
    fecha: String!
    descripcion: String!
    tipo: TipoVoluntariado!
    email: String!
  }

  type Query {
    usuarios: [Usuario!]!
    usuario(email: String!): Usuario
    voluntariados: [Voluntariado]
    seleccionados: [Voluntariado]
    voluntariado(id: ID!): Voluntariado
  }

  type Mutation {
    crearUsuario(user: String!, email: String!, password: String!, nombre: String!, tipo: String!): Usuario!
    login(user: String!, password: String!): AuthPayload!
    crearVoluntariado(titulo: String!, usuario: String!, fecha: Date!, descripcion: String!, tipo: TipoVoluntariado!, email: String!): Voluntariado!
    agregarSeleccionado(voluntariadoId: ID!): Voluntariado
    borrarSeleccionado(voluntariadoId: ID!): ID
    eliminarVoluntariado(id: ID!): ID!
    eliminarUsuario(email: String!): String!
  }
`;

const resolvers = {
  Query: {
    usuarios: async () => {
      return await Usuario.find().lean(); 
    },
    usuario: async (_, { email }) => {
      return await Usuario.findOne({ email }).lean();
    },
    voluntariados: () => Voluntariado.find(),
    voluntariado: (_, { id }) => Voluntariado.findById(id),
    seleccionados: async () => {
      const seleccionados = await Seleccionado.find();
      const ids = seleccionados.map(s => s.voluntariadoId);
      return Voluntariado.find({ _id: { $in: ids } });
    },
  },

  Mutation: {
    login: async (_, { user, password }) => {
      const usuario = await Usuario.findOne({
        $or: [
          { user: { $regex: `^${user}$`, $options: 'i' } },
          { email: { $regex: `^${user}$`, $options: 'i' } }
        ]
      });

      if (!usuario) throw new Error('Usuario no encontrado');
      if (usuario.password !== password) throw new Error('Contraseña incorrecta');

      const token = jwt.sign(
        { id: usuario._id, user: usuario.user, tipo: usuario.tipo },
        'secreto-super-seguro',
        { expiresIn: '1h' }
      );

      return {
        token,
        usuario: { user: usuario.user, email: usuario.email, tipo: usuario.tipo }
      };
    },

    crearUsuario: async (_, args) => {
      const nuevoUsuario = new Usuario(args);
      await nuevoUsuario.save();
      getIO().emit('usuario_creado', args);
      return nuevoUsuario;
    },

    eliminarUsuario: async (_, { email }) => {
      const result = await Usuario.deleteOne({ email });
      if (result.deletedCount === 0) throw new Error('Usuario no encontrado');
      getIO().emit('usuario_borrado', email);
      return 'Usuario eliminado con éxito';
    },

    crearVoluntariado: async (_, args) => {
      const nuevoVoluntariado = new Voluntariado(args);
      await nuevoVoluntariado.save();
      getIO().emit('voluntariado:nuevo', nuevoVoluntariado);
      return nuevoVoluntariado;
    },

    eliminarVoluntariado: async (_, { id }) => {
      const result = await Voluntariado.deleteOne({ _id: id });
      if (result.deletedCount === 0) throw new Error('Voluntariado no encontrado');
      await Seleccionado.deleteOne({ voluntariadoId: id });
      getIO().emit('voluntariado:eliminado', { id });
      return id;
    },

    agregarSeleccionado: async (_, { voluntariadoId }) => {
      const voluntariado = await Voluntariado.findById(voluntariadoId);
      if (!voluntariado) throw new Error('Voluntariado no encontrado');
      
      await Seleccionado.findOneAndUpdate(
        { voluntariadoId },
        { voluntariadoId },
        { upsert: true }
      );
      
      getIO().emit('seleccionado:agregado', { voluntariadoId });
      return voluntariado;
    },

    borrarSeleccionado: async (_, { voluntariadoId }) => {
      await Seleccionado.deleteOne({ voluntariadoId });
      getIO().emit('seleccionado:eliminado', { voluntariadoId });
      return voluntariadoId;
    }
  }
};


// ========================================
// INICIAR SERVIDORES
// ========================================

const apolloServer = new ApolloServer({ 
  typeDefs, 
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer: server })]
});

async function iniciarServidores() {
  try {
    // 1. Iniciar Apollo Server
    await apolloServer.start();

    // 2. Agregar Apollo como middleware en Express (ruta /graphql)
    app.use('/graphql', 
      express.json(),
      (req, res, next) => {
        apolloServer.executeHTTPGraphQLRequest({
          httpGraphQLRequest: {
            method: req.method,
            headers: new Map(Object.entries(req.headers)),
            search: new URL(req.url, `https://${req.headers.host}`).search,
            body: req.body,
          },
          context: async () => ({ req, res }),
        }).then(async (httpGraphQLResponse) => {
          for (const [key, value] of httpGraphQLResponse.headers) {
            res.setHeader(key, value);
          }
          res.status(httpGraphQLResponse.status || 200);
          if (httpGraphQLResponse.body.kind === 'complete') {
            res.send(httpGraphQLResponse.body.string);
          }
        }).catch(next);
      }
    );

    // 3. Iniciar Servidor HTTPS (Express + Sockets + GraphQL) en el puerto 3000
    server.listen(3000, () => {
      console.log('Servidor Seguro (REST + GraphQL + Sockets) en https://localhost:3000');
      console.log('GraphQL disponible en https://localhost:3000/graphql');
    });

  } catch (error) {
    console.error("Error al arrancar los servicios:", error);
  }
}

// Arrancamos todo
iniciarServidores();