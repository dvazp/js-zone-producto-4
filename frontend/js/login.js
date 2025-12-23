import { obtenerUsuarioActivo, obtenerUsuarioNombre, guardarToken, loguearUsuarioDetalle } from './almacenaje.js';

// Inicialización adaptable: si el DOM ya está listo llamamos init() inmediatamente,
// si no, lo registramos en DOMContentLoaded.
function init() {
    // Intentar adjuntar el listener, reintentando si el formulario aún no existe
    function tryAttachForm(attempt = 1) {
        const formLogin = document.getElementById("login_form");
        if (formLogin) {
            formLogin.addEventListener("submit", LoginUser);
            return true;
        }

        if (attempt >= 6) {
            return false;
        }

        setTimeout(() => tryAttachForm(attempt + 1), 200);
        return false;
    }

    tryAttachForm();
    // Listener delegado: captura submits aunque el formulario no tenga el listener directo
    document.addEventListener('submit', function(e) {
        try {
            const target = e.target;
            if (target && target.id === 'login_form') {
                e.preventDefault();
                // Call handler
                LoginUser(e);
            }
        } catch (err) {
            logger('login: error in delegated submit ' + err, 'error');
        }
    }, true);
    // Mostramos el usuario activo (si hay)
    mostrarUsuarioActivo();

    // Indicador visual para comprobar que el script ha sido ejecutado
    const status = document.getElementById('script-status');
    // Exponer un fallback global para compatibilidad con scripts antiguos
    try {
        // Establece window.userHeader si algún otro script espera esa variable global
        window.userHeader = document.getElementById('user_header') || null;
    } catch (e) {
        // ignore
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


/**
 * Manejador del envío del formulario de login.
 * - Previene el envío por defecto.
 * - Valida campos vacíos.
 * - Busca usuario en mapa y verifica contraseña.
 * - Actualiza el header si es correcta.
 * @param {SubmitEvent} event
 */
async function LoginUser(event){
    event.preventDefault();

    const inputUser = (document.getElementById('user')?.value || '').trim();
    const inputPassword = document.getElementById('password')?.value || '';

    if(!inputUser || !inputPassword){
        alert("Introduce todos los campos");
        return;
    }

    try {
        const query = `mutation Login($user: String!, $password: String!) {
            login(user: $user, password: $password) {
                token
                usuario { user email tipo }
            }
        }`;

        const resp = await fetch('http://localhost:4000/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { user: inputUser, password: inputPassword } })
        });

        const result = await resp.json();
        if (result.errors && result.errors.length > 0) {
            alert(result.errors[0].message || 'Error en el login');
            return;
        }

        const data = result.data?.login;
        if (!data) {
            alert('Respuesta inválida del servidor');
            return;
        }

        if (data.token) {
            guardarToken(data.token);
        }

        const usuario = data.usuario;
        const nombreMostrar = usuario?.user || usuario?.email || inputUser;
        // Guardamos nombre, email y tipo en localStorage
        loguearUsuarioDetalle(nombreMostrar, usuario?.email || inputUser, usuario?.tipo || 'user');
        // Actualizar header directamente para evitar efectos secundarios de otros scripts
        try {
            const headerEl = document.getElementById('user_header');
            if (headerEl) headerEl.textContent = localStorage.getItem('UsuarioActivo') || localStorage.getItem('UsuarioNombre') || '-no login-';
        } catch (e) {
            logger('login: error updating header ' + e, 'error');
        }

        // Redirigir a dashboard después de login
        try {
            window.location.href = 'dashboard.html';
            return; // evita seguir ejecutando código en esta página
        } catch (e) {
            // si falla la redirección, limpiamos los inputs como fallback
            console.error('Redirección fallida', e);
        }

        // Limpiamos inputs (fallback si no se redirige)
        document.getElementById('user').value = '';
        document.getElementById('password').value = '';
    } catch (error) {
        alert('No se pudo conectar con el servidor');
    }
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
