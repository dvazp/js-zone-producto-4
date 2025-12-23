import { obtenerUsuarioActivo, obtenerUsuarioNombre, guardarToken, loguearUsuarioDetalle } from './almacenaje.js';

const API_URL = 'http://localhost:4000/';

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
    const query = `mutation Login($user: String!, $password: String!) { login(user: $user, password: $password) { token usuario { user email tipo } } }`;
    const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { user, password } })
    });

    if (!resp.ok) throw new Error('Error en la petición al servidor');
    const json = await resp.json();
    if (json.errors && json.errors.length) throw new Error(json.errors[0].message || 'Error en el login');
    const result = json.data?.login;
    if (!result) throw new Error('Respuesta inválida del servidor');
    return result;
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
