//Importamos las funciones de almacenaje
import { obtenerUsuarioActivo, altaUsuariofetch,borrarUsuariofetch,obtenerUsuariosFetch } from './almacenaje.js';

const userHeader = document.getElementById("user_header");

// Funcion que Muestra el Usuario Activo
function mostrarUsuarioActivo() {
    let usuarioActivo = obtenerUsuarioActivo();
    if (usuarioActivo) {
        userHeader.textContent = usuarioActivo;
    } else {
        userHeader.textContent = "-no login-";
    }
}

// Funciones de mostrar y borrar los usuarios
async function listaUsuarios() {
    const consultaUser_form = document.getElementById("consultaUser_form");
    consultaUser_form.innerHTML = '';
    const usuarios = await obtenerUsuariosFetch();
    usuarios.forEach(u => {
        let contorno = document.createElement("div");
        contorno.classList.add('user-card');
        let divUsuario = document.createElement("div");

        let nombre = document.createElement("p");
        let email = document.createElement("p");
        let password = document.createElement("p");
        let acciones = document.createElement("button");

        nombre.innerHTML = `<strong>Nombre:</strong> ${u.nombre}`;
        email.innerHTML = `<strong>Email:</strong> ${u.email}`;
        password.innerHTML = `<strong>Contraseña:</strong> ${u.password}`;
        acciones.innerHTML = `Eliminar`;
        acciones.setAttribute('id', u.email);
        acciones.setAttribute('class', 'delete-btn delButton');
        acciones.setAttribute('type', 'button');

        divUsuario.appendChild(nombre);
        divUsuario.appendChild(email);
        divUsuario.appendChild(password);
        divUsuario.appendChild(acciones);

        [nombre, email, password, acciones].forEach(child => {
            child.classList.add("textoNormal");
        });

        contorno.appendChild(divUsuario);
        consultaUser_form.appendChild(contorno);
    });

    const delBtns = document.getElementsByClassName('delButton');
    for (const btn of delBtns) {
        btn.addEventListener('click', function() {
            removeUsuario(this.id); 
        });
    }
}

function getFieldValue(id, promptText) {
    const el = document.getElementById(id);
    if (el) return el.value.trim();
    const v = window.prompt(promptText);
    return v ? v.trim() : '';
}

// Añadir usuario
function addUsuario() {
    const nombre = getFieldValue('nombre');
    const email = getFieldValue('email');
    const password = getFieldValue('password');
    const user = getFieldValue('nombre');
    const tipo = getFieldValue('tipo');
    

    if (nombre == "" || email == "" || password == "") {
        window.alert("No puede haber ningún campo en blanco.");
        return;
    }

    const usuario = { user,email,password,nombre,tipo};

    try {
        altaUsuariofetch(usuario.user,usuario.email,usuario.password,usuario.nombre,usuario.tipo);
        listaUsuarios();
    } catch (error) {
        console.error('Error adding user:', error);
        window.alert(error.message);
    }
}

// Borrar usuario
 function removeUsuario(email) {
    try {
        borrarUsuariofetch(email);
        listaUsuarios();
    } catch (error) {
        console.error('Error removing user:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        listaUsuarios();
        mostrarUsuarioActivo();

        const addBtn = document.getElementById('addUser_button');
        if (addBtn) addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addUsuario();
        });
        const consultaForm = document.getElementById('consultaUser_form');
        if (consultaForm) consultaForm.addEventListener('submit', (e) => e.preventDefault());
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

