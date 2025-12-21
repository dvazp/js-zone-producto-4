// Importamos Express, el framework para crear el servidor
import express from 'express';
import http from 'http';
import { MongoClient, ObjectId  } from 'mongodb';
import fs from 'fs/promises'; // Sirve para leer el json de datos.json
import crearLoginRoute from "./routes/login.js";
import { inicializarSocket, getIO } from './socket.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';

// Definimos el puerto donde correrá el servidor (3000 por defecto)
const PORT = process.env.PORT || 3000;

// Creamos la aplicación Express
const app = express();

// Middleware que permite leer JSON en las peticiones


// Importamos los datos base de usuarios desde el frontend
/*
import { usuariosBase } from '../frontend/js/datos.js';
import { voluntariadosBase } from '../frontend/js/datos.js';
*/
let usuariosCollection;
let voluntariadosCollection;
let seleccionadosCollection;


//Prueba
const server = http.createServer(app);
inicializarSocket(server);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());
//Conexion MongoDB
const MONGO_URI =  'mongodb://127.0.0.1:27017';
const DB_NAME = 'jszone';
const archivoDatos = '../frontend/js/datos.json';
const client = new MongoClient(MONGO_URI);

async function conectarMongo(){
  let datos;
  try {
    const contenidoJson = await fs.readFile(archivoDatos, 'utf-8');
    datos = JSON.parse(contenidoJson); // Guardamos en datos todo el json de datos.json

  // Configuración de Conexión
  await client.connect();
  const db = client.db(DB_NAME);
  usuariosCollection = db.collection('usuarios');
  voluntariadosCollection = db.collection('voluntariados');
  seleccionadosCollection = db.collection('seleccionados');
  app.use("/login", crearLoginRoute(usuariosCollection));
  console.log("Conectado a MongoDB");

  // Inicialización Voluntariados y usuarios.

  const contadorUsuarios = await usuariosCollection.countDocuments(); //Contamos si hay usuarios o no.
  if(contadorUsuarios === 0){
    await usuariosCollection.insertMany(datos.usuariosBase);
    console.log("Inicializando Usuarios");
  }else{
    console.log("Los usuarios ya se han inicializado");
  }

  const contadorVoluntariados = await voluntariadosCollection.countDocuments(); //Contamos si hay usuarios o no.
  if(contadorVoluntariados === 0){
    await voluntariadosCollection.insertMany(datos.voluntariadosBase);
    console.log("Inicializando voluntariados");
  }else{
    console.log("Ya hay voluntariados insertados");
  }

  } catch (error) {
    console.log("Error al inicializar los datos")
  }
}

await conectarMongo();
// ========================================
// INICIALIZACIÓN DE DATOS
// ========================================

/* Copiamos los voluntarios a una variable que va a actuar como base de datos.
let voluntariados = voluntariadosBase;
// Copiamos los usuarios base a una variable que actuará como "base de datos" en memoria
let usuarios = usuariosBase;
*/
// ========================================
// RUTAS REST
// ========================================

app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await usuariosCollection.find().toArray();
    console.log('Estos son los usuarios', usuarios);
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
});

app.get('/usuarios/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const usuario = await usuariosCollection.findOne({ email });
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
    const nuevoUsuario = req.body;
    if (!nuevoUsuario || !nuevoUsuario.email) {
      return res.status(400).json({ message: 'Datos de usuario inválidos. Se requiere email.' });
    }

    const existeUsuario = await usuariosCollection.findOne({ email: nuevoUsuario.email });

    if (existeUsuario) {
      return res.status(400).json({ message: 'Este usuario ya existe' });
    }

    await usuariosCollection.insertOne(nuevoUsuario);
    res.status(201).json({ message: 'Usuario creado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creando usuario' });
  }
});

app.delete('/usuarios/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await usuariosCollection.deleteOne({ email });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando usuario' });
  }
});


app.get('/voluntariados', async (req, res) => {
  try {
    const voluntariados = await voluntariadosCollection.find().toArray();
    res.json(voluntariados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo voluntariados' });
  }
});

app.post('/voluntariados', async (req, res) => {
  try {
    const nuevoVoluntariado = req.body;
    const result = await voluntariadosCollection.insertOne(nuevoVoluntariado);
    getIO().emit('voluntariado:nuevo', { ...nuevoVoluntariado, _id: result.insertedId });

    res.status(201).json({ message: 'Voluntariado creado con éxito', insertedId: result.insertedId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creando voluntariado' });
  }
});

app.delete('/voluntariados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de voluntariado inválido' });
    }
    const result = await voluntariadosCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Voluntariado no encontrado' });
    }
    // También lo eliminamos de los seleccionados si estaba allí
    await seleccionadosCollection.deleteOne({ voluntariadoId: new ObjectId(id) });
    getIO().emit('voluntariado:eliminado', { id });

    res.json({ message: 'Voluntariado eliminado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando voluntariado' });
  }
});

// --- Rutas para Seleccionados ---
app.get('/seleccionados', async (req, res) => {
  try {
    const seleccionados = await seleccionadosCollection.find().toArray();
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
    if (!voluntariadoId || !ObjectId.isValid(voluntariadoId)) {
      return res.status(400).json({ message: 'ID de voluntariado inválido' });
    }
    await seleccionadosCollection.updateOne({ voluntariadoId: new ObjectId(voluntariadoId) }, { $setOnInsert: { voluntariadoId: new ObjectId(voluntariadoId) } }, { upsert: true });
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
    await seleccionadosCollection.deleteOne({ voluntariadoId: new ObjectId(id) });
    res.json({ message: 'Seleccionado eliminado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando seleccionado' });
  }
});

// ========================================
// GRAPHQL CON APOLLO SERVER
// ========================================

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = `
  type Usuario {
    _id: ID!
    user: String!
    email: String!
    password: String!
    nombre: String!
    tipo: String!
  }

  # Usuario público devuelto tras autenticación
  type UsuarioPublic {
    user: String!
    email: String!
    tipo: String!
  }

  # Payload de autenticación
  type AuthPayload {
    token: String!
    usuario: UsuarioPublic!
  }

  enum TipoVoluntariado{
  Oferta
  Peticion
  }

  scalar Date
  type Voluntariado{
        _id: ID!
        titulo: String! 
        usuario: String!
        fecha: Date!
        descripcion: String!
        tipo: TipoVoluntariado!
        email:String!
        id:ID!
  }


  type Query {
    usuarios: [Usuario!]!
    usuario(email: String!): Usuario
    voluntariados:[Voluntariado]
    seleccionados: [Voluntariado]
    voluntariado(id: ID!): Voluntariado
  }

  type Mutation {
    crearUsuario(
      user: String!
      email: String!
      password: String!
      nombre: String!
      tipo: String!
    ): Usuario!

    # Login mediante usuario y contraseña
    login(user: String!, password: String!): AuthPayload!

    crearVoluntariado(
        titulo: String! 
        usuario: String!
        fecha: Date!
        descripcion: String!
        tipo: TipoVoluntariado!
        email:String!
    ): Voluntariado!

    agregarSeleccionado(voluntariadoId: ID!): Voluntariado
    borrarSeleccionado(voluntariadoId: ID!): ID

    eliminarVoluntariado(id: ID!): ID!
    eliminarUsuario(email: String!): String!
}

`;

const resolvers = {
  Query: {
    usuarios: async () => {
      return await usuariosCollection.find().toArray();
    },
    usuario: async (parent, args) => {
      return await usuariosCollection.findOne({ email: args.email });
    },
    voluntariados: async () => {
      return await voluntariadosCollection.find().toArray();
    },
    voluntariado: async (parent, args) => {
      return await voluntariadosCollection.findOne({ _id: new ObjectId(args.id) });
    },
    seleccionados: async () => {
      const seleccionados = await seleccionadosCollection.find().toArray();
      const ids = seleccionados.map(s => s.voluntariadoId);
      return await voluntariadosCollection.find({
        _id: { $in: ids }
      }).toArray();
    },
  },

  Mutation: {
    login: async (parent, args) => {
      const { user, password } = args;

      // Buscamos por `user` (nombre) o por `email`, ignorando mayúsculas
      const query = {
        $or: [
          { user: { $regex: `^${user}$`, $options: 'i' } },
          { email: { $regex: `^${user}$`, $options: 'i' } }
        ]
      };

      const usuario = await usuariosCollection.findOne(query);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      if (usuario.password !== password) {
        throw new Error('Contraseña incorrecta');
      }

      const token = jwt.sign(
        { id: usuario._id, user: usuario.user, tipo: usuario.tipo },
        'secreto-super-seguro',
        { expiresIn: '1h' }
      );

      return {
        token,
        usuario: {
          user: usuario.user,
          email: usuario.email,
          tipo: usuario.tipo,
        }
      };
    },
    crearUsuario: async (parent, args) => {
      const { user, email, password, nombre, tipo } = args;

      const existe = await usuariosCollection.findOne({ email });
      if (existe) {
        throw new Error('Usuario ya existe');
      }

      const nuevoUsuario = { user, email, password, nombre, tipo };
      await usuariosCollection.insertOne(nuevoUsuario);
      return nuevoUsuario;
    },

    eliminarUsuario: async (parent, args) => {
      const result = await usuariosCollection.deleteOne({ email: args.email });
      if (result.deletedCount === 0) {
        throw new Error('Usuario no encontrado');
      }
      return 'Usuario eliminado con éxito';
    },

    crearVoluntariado: async (parent, args) => {
      const nuevoVoluntariado = { ...args };
      const result = await voluntariadosCollection.insertOne(nuevoVoluntariado);
      return { ...nuevoVoluntariado, _id: result.insertedId, id: result.insertedId.toString() };
    },

    eliminarVoluntariado: async (parent, args) => {
      const result = await voluntariadosCollection.deleteOne({ _id: new ObjectId(args.id) });
      if (result.deletedCount === 0) {
        throw new Error('Voluntariado no encontrado');
      }
      // También lo eliminamos de los seleccionados si estaba allí
      await seleccionadosCollection.deleteOne({ voluntariadoId: new ObjectId(args.id) });
      return args.id;
    },

    agregarSeleccionado: async (_, { voluntariadoId }) => {
      const voluntariado = await voluntariadosCollection.findOne({ _id: new ObjectId(voluntariadoId) });
      if (!voluntariado) {
        throw new Error('Voluntariado no encontrado');
      }
      await seleccionadosCollection.updateOne({ voluntariadoId: new ObjectId(voluntariadoId) }, { $setOnInsert: { voluntariadoId: new ObjectId(voluntariadoId) } }, { upsert: true });
      return voluntariado;
    },

    borrarSeleccionado: async (_, { voluntariadoId }) => {
      await seleccionadosCollection.deleteOne({ voluntariadoId: new ObjectId(voluntariadoId) });
      return voluntariadoId;
    }
  }
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
});

// ========================================
// INICIAR SERVIDORES
// ========================================

// Servidor REST en puerto 3000
server.listen(PORT, () => {
  console.log(`Servidor REST corriendo en: http://localhost:${PORT}`);

});

// Servidor GraphQL en puerto 4000 (NO usar await apolloServer.start())
const { url } = await startStandaloneServer(apolloServer, {
  listen: { port: 4000 },
});

console.log(` Servidor GraphQL corriendo en: ${url}`);


