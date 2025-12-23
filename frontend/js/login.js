import { obtenerUsuarioActivo, obtenerUsuarioNombre, guardarToken, loguearUsuarioDetalle } from './almacenaje.js';

const API_URL = 'http://localhost:4000/';
let socket = null;

function getSocket() {
    if (socket) return socket;
    if (typeof io === 'undefined') throw new Error('Socket.io client no disponible');
    socket = io('https://localhost:3000');
    return socket;
}

function onDomReady(cb) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb);
    else cb();
}

onDomReady(() => {
    const form = document.getElementById('login_form');
    if (form) form.addEventListener('submit', LoginUser);
    mostrarUsuarioActivo();
    try { window.userHeader = document.getElementById('user_header') || null; } catch (e) {}
});


/**
 * Manejador del envío del formulario de login.
 * - Previene el envío por defecto.
 * - Valida campos vacíos.
 * - Busca usuario en mapa y verifica contraseña.
 * - Actualiza el header si es correcta.
 * @param {SubmitEvent} event
 */
async function LoginUser(event) {
    if (event && event.preventDefault) event.preventDefault();
    const userEl = document.getElementById('user');
    const passEl = document.getElementById('password');
    const user = (userEl?.value || '').trim();
    const password = passEl?.value || '';

    if (!user || !password) return alert('Introduce todos los campos');

    try {
        const data = await sendLoginRequest(user, password);
        handleLoginSuccess(data, user);
    } catch (err) {
        alert(err.message || 'No se pudo conectar con el servidor');
    }
}

async function sendLoginRequest(user, password) {
    return new Promise((resolve, reject) => {
        let sock;
        try {
            sock = getSocket();
        } catch (err) {
            return reject(err);
        }

        try {
            sock.emit('login', { user, password }, (response) => {
                if (!response) return reject(new Error('No hay respuesta del servidor'));
                if (!response.success) return reject(new Error(response.message || 'Error en el login'));
                resolve({ token: response.token, usuario: response.usuario });
            });
        } catch (err) {
            reject(err);
        }
    });
}

function handleLoginSuccess(data, fallbackUser) {
    if (data.token) guardarToken(data.token);
    const usuario = data.usuario || {};
    const nombreMostrar = usuario.user || usuario.email || fallbackUser;
    loguearUsuarioDetalle(nombreMostrar, usuario.email || fallbackUser, usuario.tipo || 'user');
    const headerEl = document.getElementById('user_header');
    if (headerEl) headerEl.textContent = localStorage.getItem('UsuarioActivo') || localStorage.getItem('UsuarioNombre') || '-no login-';
    try { location.assign('dashboard.html'); } catch (e) { console.error('Redirección fallida', e); }
}

// Funcion que MuestraUsuarioActivo
function mostrarUsuarioActivo() {
    const nombre = obtenerUsuarioNombre();
    const usuarioActivo = obtenerUsuarioActivo();
    const userHeaderEl = document.getElementById('user_header');
    if (!userHeaderEl) return;
    if (usuarioActivo) {
        userHeaderEl.textContent = usuarioActivo;
    } else if (nombre) {
        userHeaderEl.textContent = nombre;
    } else {
        userHeaderEl.textContent = "-no login-";
    }
}
