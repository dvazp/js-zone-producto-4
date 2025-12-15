document.addEventListener('DOMContentLoaded', () => {
    // Registra el manejador del evento submit del formulario (con guard)
    formLogin?.addEventListener("submit", LoginUser); 
    // Mostramos el usuario activo
    mostrarUsuarioActivo();
})
// Importa funciones de localStorage desde almacenaje.js
import { obtenerUsuarioActivo, loguearUsuario, obtenerUsuarioPorEmail } from './almacenaje.js';


// Referencias a elementos del DOM usados por el formulario de login
const formLogin = document.getElementById("login_form");
const correo = document.getElementById("user");
const password = document.getElementById("password");
const userHeader = document.getElementById("user_header");


/**
 * Manejador del envío del formulario de login.
 * - Previene el envío por defecto.
 * - Valida campos vacíos.
 * - Busca usuario en mapa y verifica contraseña.
 * - Actualiza el header si es correcta.
 * @param {SubmitEvent} event
 */
function LoginUser(event){
    event.preventDefault();

    const inputUser = correo.value.trim();
    const inputPassword = password.value;

    if(!inputUser || !inputPassword){
        alert("Introduce todos los campos");
        return;
    }

    // Busca al usuario en localStorage
    const foundUser = obtenerUsuarioPorEmail(inputUser);
    if(!foundUser){
        alert("El usuario no existe");
        return;
    }

    if(foundUser.password !== inputPassword){
        alert("La contraseña no coincide");
        return;
    }
    
    // Credenciales correctas
    alert("Inicio de sesión correcto");
    loguearUsuario(correo.value)
    mostrarUsuarioActivo();
    // Borramos los valores del input para que quede correcto.
    correo.value = "";
    password.value = "";
}

// Funcion que MuestraUsuarioActivo
function mostrarUsuarioActivo() {
    let usuarioActivo = obtenerUsuarioActivo();
    if (usuarioActivo) {
        userHeader.textContent = usuarioActivo;
    } else {
        userHeader.textContent = "-no login-";
    }
}

