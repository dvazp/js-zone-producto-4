import { obtenerUsuarioActivo, obtenerVoluntariados, obtenerSeleccionados, agregarSeleccionado, borrarSeleccionado } from './almacenaje.js';




// Socket.io está disponible globalmente desde el CDN
const socket = io("http://localhost:3000");

// Verificar conexión
socket.on('connect', () => {
    console.log('✅ Socket.io conectado con ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión Socket.io:', error);
});

// Escuchar eventos de actualización en tiempo real
socket.on('voluntariado:nuevo', (voluntariado) => {
    console.log('📢 Nuevo voluntariado recibido:', voluntariado);
    displayVoluntariados();
});

socket.on('voluntariado:eliminado', ({ id }) => {
    console.log('🗑️ Voluntariado eliminado:', id);
    displayVoluntariados();
});

socket.on('seleccionado:agregado', ({ voluntariadoId }) => {
    console.log('➕ Seleccionado agregado:', voluntariadoId);
    displayVoluntariados();
});

// ...existing code...

// Primero mostramos el usuario activo
function mostrarUsuarioActivo() {
    const userHeader = document.getElementById("user_header");
    let usuarioActivo = obtenerUsuarioActivo();
    if (!usuarioActivo) {
        userHeader.textContent = "-no login-";
        return false;
    } else {
        userHeader.textContent = usuarioActivo;
        return true;
    }
}

//Funcion para mostrar los voluntariados en el div "lista"
async function displayVoluntariados(filter = 'all') {
    const disponiblesContainer = document.getElementById("lista");
    const seleccionadosContainer = document.getElementById("contenedor-seleccion");
    
    // Limpiamos ambos contenedores para evitar duplicados al filtrar
    disponiblesContainer.innerHTML = '';
    seleccionadosContainer.innerHTML = '';

    let [voluntariados, seleccionadosIds] = await Promise.all([obtenerVoluntariados(), obtenerSeleccionados()]);

    if (filter === 'mine') {
        const usuarioActivo = obtenerUsuarioActivo();
        if (usuarioActivo) {
            voluntariados = voluntariados.filter(v => v.email === usuarioActivo);
        }
    }

    voluntariados.forEach((voluntariado) => {
        // Revisamos el tipo para ver si es peticion o oferta y aplicamos el color de fondo
        const bgColor = voluntariado.tipo === 'Petición' ? 'bg-primary' : 'bg-success';

        const divVoluntario = document.createElement("div");
        divVoluntario.classList.add("grab", "card", "col-12", "mb-3", "col-lg-3", "rounded" ,"p-5", bgColor, "d-flex","align-items-start","efectoCard","mx-2","mx-3");
        divVoluntario.style.width = "auto";
        divVoluntario.id = `voluntariado-${voluntariado.id}`;

        // Arrastrable
        divVoluntario.draggable = true;
        divVoluntario.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.id);

            setTimeout(() => {
                e.target.style.opacity = '0.5';
            }, 0);
        });

        divVoluntario.addEventListener('dragend', (e) => {
            e.target.style.opacity = '1';
        });

        // Creamos los datos de los voluntarios
        let titulo = document.createElement("p");
        let usuario = document.createElement("p");
        let fecha = document.createElement("p");
        let descripcion = document.createElement("p");

        // Le añadimos el contenido
        titulo.innerHTML = voluntariado.titulo;
        usuario.innerHTML = `Publicado por : ${voluntariado.usuario}`;
        fecha.innerHTML =  `Fecha : ${voluntariado.fecha}`;
        descripcion.innerHTML = voluntariado.descripcion;

        titulo.classList.add("textoNormal");
        fecha.classList.add("fecha");
        descripcion.classList.add("textoNormal");
        usuario.classList.add("textoNormal");
        
        // Los añadimos al html
        divVoluntario.append(titulo, fecha, descripcion, usuario);

        // Colocar la tarjeta en el contenedor correcto
        if (seleccionadosIds.has(voluntariado.id)) {
            seleccionadosContainer.appendChild(divVoluntario);
        } else {
            disponiblesContainer.appendChild(divVoluntario);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const login = mostrarUsuarioActivo();
    displayVoluntariados();

    const todasBtn = document.getElementById('Todas');
    const miasBtn = document.getElementById('Mias');

    if (login){
        todasBtn.addEventListener('click', () => displayVoluntariados('all'));
        miasBtn.addEventListener('click', () => displayVoluntariados('mine'));
    } else {
        miasBtn.style.display = 'none';
        todasBtn.addEventListener('click', () => displayVoluntariados('all'));
    }

    const destino = document.getElementById('contenedor-seleccion');
    const origen = document.getElementById('lista');

    // Permitir soltar en el contenedor de "seleccionados"
    destino.addEventListener('dragover', (e) => {
        e.preventDefault();
        destino.classList.add('drag-over');
    });

    destino.addEventListener('dragleave', () => {
        destino.classList.remove('drag-over');
    });

    destino.addEventListener('drop', (e) => {
        e.preventDefault();
        destino.classList.remove('drag-over');
        const cardId = e.dataTransfer.getData('text/plain');
        const tarjetaArrastrable = document.getElementById(cardId);
        
        if (tarjetaArrastrable) {
            // Guardar en IndexedDB
            const voluntariadoId = parseInt(cardId.replace('voluntariado-', ''), 10);
            agregarSeleccionado(voluntariadoId).catch(console.error);

            destino.appendChild(tarjetaArrastrable);
        }
    });

    // Permitir soltar de vuelta en el contenedor de "disponibles"
    origen.addEventListener('dragover', (e) => {
        e.preventDefault();
        origen.classList.add('drag-over');
    });

    origen.addEventListener('dragleave', () => {
        origen.classList.remove('drag-over');
    });

    origen.addEventListener('drop', (e) => {
        e.preventDefault();
        origen.classList.remove('drag-over');
        const cardId = e.dataTransfer.getData('text/plain');
        const tarjetaArrastrable = document.getElementById(cardId);
        if (tarjetaArrastrable) {
            // Eliminar de IndexedDB
            const voluntariadoId = parseInt(cardId.replace('voluntariado-', ''), 10);
            borrarSeleccionado(voluntariadoId).catch(console.error);

            origen.appendChild(tarjetaArrastrable);
        }
    });
});