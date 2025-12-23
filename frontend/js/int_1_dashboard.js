import { obtenerUsuarioActivo, obtenerVoluntariados, obtenerSeleccionados, agregarSeleccionado, borrarSeleccionado } from './almacenaje.js';

// Socket.io está disponible globalmente desde el CDN
const socket = io("https://localhost:3000");

// Variable para recordar qué filtro estamos usando (Todas o Mias)
let filtroActual = 'all';

// Verificar conexión
socket.on('connect', () => {
    console.log('✅ Socket.io conectado con ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión Socket.io:', error);
});

// === ESCUCHAR EVENTOS (Esto actualiza la interfaz automáticamente) ===

socket.on('voluntariado:nuevo', (voluntariado) => {
    console.log('📢 Nuevo voluntariado recibido');
    displayVoluntariados(filtroActual);
});

socket.on('voluntariado:eliminado', ({ id }) => {
    console.log('🗑️ Voluntariado eliminado');
    displayVoluntariados(filtroActual);
});

socket.on('seleccionado:agregado', ({ voluntariadoId }) => {
    console.log('➕ Seleccionado agregado');
    displayVoluntariados(filtroActual);
});

socket.on('seleccionado:eliminado', ({ voluntariadoId }) => {
    console.log('➖ Seleccionado eliminado');
    displayVoluntariados(filtroActual);
});


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

// Funcion para mostrar los voluntariados
async function displayVoluntariados(filter = 'all') {
    filtroActual = filter; // Actualizamos la variable global

    const disponiblesContainer = document.getElementById("lista");
    const seleccionadosContainer = document.getElementById("contenedor-seleccion");
    
    // Limpiamos ambos contenedores
    disponiblesContainer.innerHTML = '';
    seleccionadosContainer.innerHTML = '';

    let [voluntariados, seleccionadosIds] = await Promise.all([obtenerVoluntariados(), obtenerSeleccionados()]);

    if (filter === 'mine') {
        const usuarioActivo = obtenerUsuarioActivo();
        if (usuarioActivo) {
            voluntariados = voluntariados.filter(v => v.email === usuarioActivo || v.usuario === usuarioActivo);
        }
    }

    voluntariados.forEach((voluntariado) => {
        // Aseguramos el ID correcto (string)
        const id = voluntariado._id || voluntariado.id;

        // Revisamos el tipo para ver si es peticion o oferta y aplicamos el color de fondo
        const bgColor = voluntariado.tipo === 'Petición' ? 'bg-primary' : 'bg-success';

        const divVoluntario = document.createElement("div");
        // MANTENIENDO TU DISEÑO EXACTO:
        divVoluntario.classList.add("grab", "card", "col-12", "mb-3", "col-lg-3", "rounded" ,"p-5", bgColor, "d-flex","align-items-start","efectoCard","mx-2","mx-3");
        divVoluntario.style.width = "auto";
        divVoluntario.id = `voluntariado-${id}`; // ID del elemento DOM

        // Arrastrable
        divVoluntario.draggable = true;
        
        divVoluntario.addEventListener('dragstart', (e) => {
            // Guardamos el ID limpio directamente
            e.dataTransfer.setData('text/plain', id);
            e.dataTransfer.effectAllowed = "move";

            setTimeout(() => {
                e.target.style.opacity = '0.5';
            }, 0);
        });

        divVoluntario.addEventListener('dragend', (e) => {
            e.target.style.opacity = '1';
        });

        // Creamos los datos de los voluntarios (TU LÓGICA UI INTACTA)
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

        // --- LÓGICA DE DISTRIBUCIÓN ---
        // Aquí decidimos en qué columna va
        if (seleccionadosIds.has(id)) {
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

    // === EVENTOS DRAG & DROP (ZONA SELECCIONADOS) ===
    destino.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        destino.classList.add('drag-over');
    });

    destino.addEventListener('dragleave', () => {
        destino.classList.remove('drag-over');
    });

    destino.addEventListener('drop', async (e) => {
        e.preventDefault();
        destino.classList.remove('drag-over');
        
        // Recuperamos el ID que guardamos en dragstart
        const id = e.dataTransfer.getData('text/plain');
        
        if (id) {
            // NO usamos parseInt (rompe los IDs de Mongo).
            // NO hacemos appendChild manual. Esperamos al socket.
            try {
                await agregarSeleccionado(id); 
            } catch (err) {
                console.error(err);
            }
        }
    });

    // === EVENTOS DRAG & DROP (ZONA DISPONIBLES) ===
    origen.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        origen.classList.add('drag-over');
    });

    origen.addEventListener('dragleave', () => {
        origen.classList.remove('drag-over');
    });

    origen.addEventListener('drop', async (e) => {
        e.preventDefault();
        origen.classList.remove('drag-over');

        const id = e.dataTransfer.getData('text/plain');

        if (id) {
            // NO usamos parseInt.
            // Llamamos a borrarSeleccionado y esperamos al socket.
            try {
                await borrarSeleccionado(id);
            } catch (err) {
                console.error(err);
            }
        }
    });
});