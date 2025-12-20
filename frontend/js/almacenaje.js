
import { usuariosBase, voluntariadosBase } from "./datos.js"; 

// Funcion que obtiene el usuario activo del localStorage.
export function obtenerUsuarioActivo() {
    const usuarioActivo = localStorage.getItem("UsuarioActivo");
    return usuarioActivo;
}

// Funcion que guarda el usuario logueado como usuario activo.
export function loguearUsuario(usuario) {
    localStorage.setItem("UsuarioActivo", usuario);
}

// CRUD de localStorage para usuarios
const USERS_KEY = 'AppUsers';

export function obtenerUsuarios() {
    const storedData = localStorage.getItem(USERS_KEY);

    if (!storedData) {
        guardarUsuarios(usuariosBase);
        console.log('Usuarios iniciales plantados en localStorage.');
        return usuariosBase;
    }

    console.log('Usuarios cargados desde localStorage:', storedData);
    return JSON.parse(storedData);
}

export function guardarUsuarios(usuarios) {
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
}

export function obtenerUsuarioPorEmail(email) {
    const usuarios = obtenerUsuarios();
    return usuarios.find(u => u.email === email) || null;
}

export function agregarUsuario(usuario) {
    const usuarios = obtenerUsuarios();
    if (obtenerUsuarioPorEmail(usuario.email)) {
        throw new Error('Ya existe un usuario con este email.');
    }
    usuarios.push(usuario);
    guardarUsuarios(usuarios);
}

export function borrarUsuario(email) {
    const usuarios = obtenerUsuarios();
    const index = usuarios.findIndex(u => u.email === email);
    if (index > -1) {
        usuarios.splice(index, 1);
        guardarUsuarios(usuarios);
    }
}

// Fin de usuarios.

// -- Inicio Fase 4 Usuarios -- //
// export function obtenerUsuarios() {
//     const storedData = localStorage.getItem(USERS_KEY);

//     if (!storedData) {
//         guardarUsuarios(usuariosBase);
//         console.log('Usuarios iniciales plantados en localStorage.');
//         return usuariosBase;
//     }

//     console.log('Usuarios cargados desde localStorage:', storedData);
//     return JSON.parse(storedData);
// }

export const obtenerUsuariosFetch = async () => {

    const QuerySQL =`
    query {
    usuarios {
        nombre
        email
  }
}`
try{
    const response = await fetch('http://localhost:4000/',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query: QuerySQL }) // Enviamos la query
    });
    const resultado = await response.json();
    return resultado.data.usuarios;
}catch(error){

    console.error("Error en la petición:",error);
    return[]
}
};

// DB para los voluntariados

const DB_NAME = 'VoluntariadosDB';
const STORE_NAME = 'voluntariados';
const SELECCIONADOS_STORE_NAME = 'seleccionados';
const DB_VERSION = 2; // Incrementar versión para onupgradeneeded

let dbPromise = null;

function initDB() {
    // evita,mos abrir la DB varias veces
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos IndexedDB:', event.target.error);
            reject('Error de IndexedDB: ' + event.target.error);
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

                objectStore.createIndex('tipo', 'tipo', { unique: false });
                objectStore.createIndex('usuario', 'usuario', { unique: false });

                console.log('Creando almacén y plantando datos iniciales...');
                voluntariadosBase.forEach(voluntariado => {
                    objectStore.add(voluntariado);
                });
            }

            // Crear el nuevo almacén para los seleccionados si no existe
            if (!db.objectStoreNames.contains(SELECCIONADOS_STORE_NAME)) {
                db.createObjectStore(SELECCIONADOS_STORE_NAME, { keyPath: 'id' });
            }
        };
    });

    return dbPromise;
}

export async function obtenerVoluntariados() {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);

        const request = objectStore.getAll();

        request.onerror = (event) => {
            console.error('Error al obtener voluntariados:', event.target.error);
            reject('Error al leer de la BD: ' + event.target.error); // Fallo
        };

        request.onsuccess = (event) => {
            resolve(event.target.result); //Jiji acierto
        };
    });
}

// --- CRUD para Voluntariados Seleccionados ---

export async function obtenerSeleccionados() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SELECCIONADOS_STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(SELECCIONADOS_STORE_NAME);
        const request = objectStore.getAll();

        request.onerror = (event) => {
            console.error('Error al obtener seleccionados:', event.target.error);
            reject('Error al leer de la BD: ' + event.target.error);
        };

        request.onsuccess = (event) => {
            // Devolvemos un Set de IDs para búsquedas rápidas
            const ids = new Set(event.target.result.map(item => item.id));
            resolve(ids);
        };
    });
}

export async function agregarSeleccionado(voluntariadoId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SELECCIONADOS_STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(SELECCIONADOS_STORE_NAME);
        const request = objectStore.add({ id: voluntariadoId });

        request.onerror = (event) => {
            console.error('Error al agregar seleccionado:', event.target.error);
            reject('Error al escribir en la BD: ' + event.target.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}

export async function borrarSeleccionado(voluntariadoId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SELECCIONADOS_STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(SELECCIONADOS_STORE_NAME);
        const request = objectStore.delete(voluntariadoId);

        request.onerror = (event) => {
            console.error('Error al borrar seleccionado:', event.target.error);
            reject('Error al borrar de la BD: ' + event.target.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}

export async function agregarVoluntariado(voluntariado) {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        if (!voluntariado.id) {
            voluntariado.id = new Date().getTime();
        }

        const request = objectStore.add(voluntariado);

        request.onerror = (event) => {
            console.error('Error al agregar voluntariado:', event.target.error);
            reject('Error al escribir en la BD: ' + event.target.error); // Jiji ha fallado
        };

        request.onsuccess = (event) => {
            resolve(); // Jiji ha funcionado
        };
    });
}

export async function borrarVoluntariado(id) {
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        const idNumerico = Number(id);

        const request = objectStore.delete(idNumerico);

        request.onerror = (event) => {
            console.error('Error al borrar voluntariado:', event.target.error);
            reject('Error al borrar de la BD: ' + event.target.error); // Jiji ha fallado otra vez
        };

        request.onsuccess = (event) => {
            resolve(); // Jiji esto tambiém ha funcionado
        };
    });
}