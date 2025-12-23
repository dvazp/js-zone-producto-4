import mongoose from 'mongoose';

// Schema de Usuario
const usuarioSchema = new mongoose.Schema({
  user: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nombre: { type: String, required: true },
  tipo: { type: String, required: true, enum: ['admin', 'usuario'] }
}, { timestamps: true });

// Schema de Voluntariado
const voluntariadoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  usuario: { type: String, required: true },
  fecha: { type: String, required: true },  // Cambiado a String para coincidir con tus datos
  descripcion: { type: String, required: true },
  tipo: { type: String, required: true, enum: ['Oferta', 'Peticion'] },
  email: { type: String, required: true }
}, { timestamps: true });

// Schema de Seleccionado
const seleccionadoSchema = new mongoose.Schema({
  voluntariadoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Voluntariado', 
    required: true,
    unique: true 
  }
}, { timestamps: true });

// Crear los modelos
const Usuario = mongoose.model('Usuario', usuarioSchema);
const Voluntariado = mongoose.model('Voluntariado', voluntariadoSchema);
const Seleccionado = mongoose.model('Seleccionado', seleccionadoSchema);

// Exportar todos los modelos con named exports
export { Usuario, Voluntariado, Seleccionado };