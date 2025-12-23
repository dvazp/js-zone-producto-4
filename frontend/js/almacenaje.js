
import { usuariosBase, voluntariadosBase } from "./datos.js"; 

// Funcion que obtiene el usuario activo desde localStorage.
export function obtenerUsuarioActivo() {
    const usuarioActivo = localStorage.getItem("UsuarioActivo");
    return usuarioActivo;
}

// Funcion que guarda el usuario logueado como usuario activo en localStorage.
export function loguearUsuarioDetalle(nombre, email, tipo) {
    if (email) localStorage.setItem('UsuarioActivo', email);
    if (nombre) localStorage.setItem('UsuarioNombre', nombre);
    if (tipo) localStorage.setItem('UsuarioTipo', tipo);
}

export function obtenerUsuarioTipo() {
    return localStorage.getItem('UsuarioTipo');
}

export function esAdmin() {
    return obtenerUsuarioTipo() === 'admin';
}

// Guardar / obtener token de sesión (no usar localStorage)
export function guardarToken(token) {
    if (token) localStorage.setItem('authToken', token);
}

export function obtenerToken() {
    return localStorage.getItem('authToken');
}

export function obtenerUsuarioNombre() {
    return localStorage.getItem('UsuarioNombre');
}



// -- Inicio Fase 4 Usuarios -- //
// Fetch para obtener la lista de los usuarios
export const obtenerUsuariosFetch = async () => {

    const QuerySQL =`
    query {
    usuarios {
        nombre
        email
        password
  }
}`
try{
    const response = await fetch('https://localhost:4000/',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query: QuerySQL }) // Enviamos la query
    });
    const resultado = await response.json();

    if(resultado.errors){
        console.error("Error de Apollo",resultado.errors[0].message);
        return[];
    }
    return resultado.data?.usuarios || [];
}catch(error){

    console.error("Error en la petición:",error);
    return[]
}};

// Fetch para dar de alta a un usuario
export const altaUsuariofetch = async (user,email,password,nombre,tipo) => {
    const QuerySQL =`
   mutation crearUsuario($user: String!,$email: String!,$password: String!,$nombre: String!,$tipo: String!) {
   crearUsuario(user: $user,email: $email,password: $password,nombre: $nombre,tipo: $tipo) {
    user
    email
    password
    nombre
    tipo
  }
}`
try{
    const response = await fetch('https://localhost:4000/',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
        query: QuerySQL,
        variables:{
            user: user,
            email: email,
            password: password,
            nombre: nombre,
            tipo: tipo
        } 
    })
    });
    const resultado = await response.json();
    if(resultado.errors){
        console.log(resultado.errors)
    }
    return resultado.data.crearUsuario;
}catch(error){
    console.error("Error en la petición:",error);
    return null
}};


//--Fetch para borrar los usuarios de la DB--//
export const borrarUsuariofetch = async (email) => {
    const QuerySQL =
    `
    mutation eliminarUsuario($email: String!) {
      eliminarUsuario(email: $email)
    }`;
try{
    const response = await fetch('https://localhost:4000/',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
        query: QuerySQL,
        variables:{
            email: email,
        } 
    })
    });
    const resultado = await response.json();
    if(resultado.errors){
        console.log(resultado.errors)
    }
}catch(error){
    console.error("Error en la petición:",error);
    return null
}};


const REST_API_URL = 'https://localhost:3000';

export async function obtenerVoluntariados() {
    try {
        const response = await fetch(`${REST_API_URL}/voluntariados`);
        if (!response.ok) throw new Error('Error conectando al servidor');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error obteniendo voluntariados:", error);
        return [];
    }
}

export async function agregarVoluntariado(voluntariado) {
    try {
        // No generamos ID aquí, dejamos que MongoDB lo haga
        const response = await fetch(`${REST_API_URL}/voluntariados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(voluntariado)
        });
        
        if (!response.ok) throw new Error('Error al guardar en servidor');
        return await response.json(); // Retorna el objeto creado con su ID
    } catch (error) {
        console.error("Error agregando voluntariado:", error);
        throw error;
    }
}

export async function borrarVoluntariado(id) {
    try {
        const response = await fetch(`${REST_API_URL}/voluntariados/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Error borrando en servidor');
        return await response.json();
    } catch (error) {
        console.error("Error borrando voluntariado:", error);
        throw error;
    }
}

// --- CRUD para Voluntariados Seleccionados (También via Server) ---

export async function obtenerSeleccionados() {
    try {
        const response = await fetch(`${REST_API_URL}/seleccionados`);
        if (!response.ok) throw new Error('Error obteniendo seleccionados');
        const idsArray = await response.json();
        // Convertimos el array de IDs en un Set para mantener la compatibilidad con tu código anterior
        return new Set(idsArray);
    } catch (error) {
        console.error("Error obteniendo seleccionados:", error);
        return new Set();
    }
}

export async function agregarSeleccionado(voluntariadoId) {
    try {
        await fetch(`${REST_API_URL}/seleccionados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voluntariadoId })
        });
    } catch (error) {
        console.error("Error agregando seleccionado:", error);
        throw error;
    }
}

export async function borrarSeleccionado(voluntariadoId) {
    try {
        await fetch(`${REST_API_URL}/seleccionados/${voluntariadoId}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error("Error borrando seleccionado:", error);
        throw error;
    }
}