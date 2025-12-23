//Importamos todas las funciones de almacenaje.js
import { obtenerUsuarioActivo, obtenerVoluntariados, agregarVoluntariado, borrarVoluntariado } from './almacenaje.js';


const socket = io("http://localhost:3000");


// Escuchar actualizaciones en tiempo real
// Cuando se crea un voluntariado
socket.on('voluntariado:nuevo', (dato) => {
    console.log("Socket: Nuevo voluntariado recibido", dato);
    displayVoluntariados(); // Recargamos la lista
});

// Cuando se elimina un voluntariado
socket.on('voluntariado:eliminado', (dato) => {
    console.log("Socket: Voluntariado eliminado", dato);
    displayVoluntariados(); // Recargamos la lista
});

// Cuando alguien selecciona un voluntariado
socket.on('seleccionado:agregado', (dato) => {
    console.log("Socket: Alguien seleccionó un voluntariado", dato);
    displayVoluntariados(); 
});

// Cuando alguien deselecciona
socket.on('seleccionado:eliminado', (dato) => {
    console.log("Socket: Alguien deseleccionó", dato);
    displayVoluntariados();
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

//Funcion para mostrar los voluntariados en el div "lista"
async function displayVoluntariados() {
    const listaDiv = document.getElementById("lista");
    listaDiv.innerHTML = '';

    let voluntariados = await obtenerVoluntariados();
    
    voluntariados.forEach((voluntariado) => {
        // SEGURIDAD: Nos aseguramos de tener un ID válido (sea _id o id)
        const idReal = voluntariado._id || voluntariado.id;

        const voluntariadoDiv = document.createElement('div');
        voluntariadoDiv.classList.add('voluntariado-item');
        voluntariadoDiv.innerHTML = `
            <div class="voluntariado-card">
                <p><strong>Título:</strong> ${voluntariado.titulo}</p>
                <p><strong>Usuario:</strong> ${voluntariado.usuario}</p>
                <p><strong>Fecha:</strong> ${voluntariado.fecha}</p>
                <p><strong>Descripción:</strong> ${voluntariado.descripcion}</p>
                <p><strong>Tipo:</strong> ${voluntariado.tipo}</p>
                <button class="delete-btn" data-id="${idReal}" type="button">Eliminar</button>
            </div>
        `;
        
        listaDiv.appendChild(voluntariadoDiv);
    });

    // Añadir funcionalidad a los botones de eliminar
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id; 
            
            console.log("ID recuperado:", id); // Para verificar en consola
            
            if(id && id !== "undefined") {
                eliminarVoluntariado(id);
            } else {
                console.error("ID inválido al intentar borrar");
            }
        });
    });

    cargarCanvas(voluntariados);
}

//Añadir un nuevo voluntariado
function getFieldValue(id, promptText) {
    const el = document.getElementById(id);
    if (el) return el.value.trim();
    const v = window.prompt(promptText);
    return v ? v.trim() : '';
}

async function addVoluntariado(event) {
    if(event) event.preventDefault();
    
    const titulo = getFieldValue('titulo', 'Título:');
    const usuario = getFieldValue('usuario', 'Usuario:');
    const fecha = getFieldValue('fecha', 'Fecha (ej. 16-10-2025):');
    const descripcion = getFieldValue('descripcion', 'Descripción:');
    const tipo = getFieldValue('tipo', 'Tipo:');
    const email = obtenerUsuarioActivo(); // Obtener el email del usuario activo

    if (titulo == "" || usuario == "" || fecha == "" || descripcion == "" || tipo == "") {
        window.alert("No puede haber ningún campo en blanco.");
        return;
    }

    const nuevo = { titulo, usuario, fecha, descripcion, tipo, email};

    try {
        await agregarVoluntariado(nuevo);

        ['titulo', 'usuario', 'fecha', 'descripcion', 'tipo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // await displayVoluntariados();
    } catch (error) {
        console.error('Error al añadir un nuevo usuario:', error);
        window.alert(error.message);
    }

    console.log('Voluntariado añadido:', nuevo);
}

async function eliminarVoluntariado(id) {
    try {
        await borrarVoluntariado(id);
        // await displayVoluntariados();
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
    }
}

function cargarCanvas(voluntariados) {
    const conteoTipos = {};

    voluntariados.forEach(voluntariado => {
        const tipo = voluntariado.tipo;
        conteoTipos[tipo] = (conteoTipos[tipo] || 0) + 1;
    });

    const datosGrafico = Object.keys(conteoTipos).map(tipo => {
        return {
            tipo: tipo,
            cantidad: conteoTipos[tipo]
        };
    });

    const canvas = document.getElementById('voluntariadoCanvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr); 

    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    const padding = 50;
    const chartWidth = canvasWidth - padding * 2;
    const chartHeight = canvasHeight - padding * 2;

    const maxValor = Math.max(...datosGrafico.map(d => d.cantidad)) + 1;

    // Calcular el ancho de cada barra
    const anchoBarra = (chartWidth / datosGrafico.length) * 0.6; // 60% del espacio
    const espacioBarra = (chartWidth / datosGrafico.length) * 0.4; // 40% restante

    // Ejes
    ctx.beginPath();
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartHeight + padding);
    ctx.lineTo(chartWidth + padding, chartHeight + padding);
    ctx.stroke();

    ctx.fillStyle = '#4B5563'; // Color de texto
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= maxValor; i++) {
        const yPos = chartHeight + padding - (i / maxValor) * chartHeight;
        
        if (i > 0) {
            ctx.fillText(i, padding - 10, yPos);
            ctx.beginPath();
            ctx.strokeStyle = '#E5E7EB';
            ctx.moveTo(padding, yPos);
            ctx.lineTo(chartWidth + padding, yPos);
            ctx.stroke();
        }
    }

    const colores = ['#138856', '#0509fcff'];
    let xActual = padding + (espacioBarra / 2);

    datosGrafico.forEach((dato, index) => {
        const alturaBarra = (dato.cantidad / maxValor) * chartHeight;
        const yBarra = chartHeight + padding - alturaBarra;

        ctx.fillStyle = colores[index % colores.length];
        ctx.fillRect(xActual, yBarra, anchoBarra, alturaBarra);

        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(dato.tipo, xActual + (anchoBarra / 2), chartHeight + padding + 10);

        // Movernos a la posición de la siguiente barra
        xActual += anchoBarra + espacioBarra;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const login = mostrarUsuarioActivo();
    displayVoluntariados();

    const addBtn = document.getElementById('addVoluntariado_button');
    const alertaInicio = document.getElementById('alerta-inicio');

    if (login) {
        alertaInicio.style.display = 'none';
        if (addBtn) addBtn.addEventListener('click', addVoluntariado);
    } else {
        addBtn.classList.remove('btn-primary');
        addBtn.classList.add('btn-danger', 'disabled');
    }
});
