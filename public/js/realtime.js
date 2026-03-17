const socket = io();

// Función que usará la recepcionista
function enviarAvisoAlDoctor(nombrePaciente, idDoctor, idRecep) {
    socket.emit('notificar-paciente', {
        paciente: nombrePaciente,
        doctorId: idDoctor,
        recepcionistaId: idRecep
    });
}

// Función que usará el doctor
function responderAlPaso(nombrePaciente, idRecep) {
    socket.emit('autorizar-paso', {
        paciente: nombrePaciente,
        recepcionistaId: idRecep
    });
}

// =============================================
// TABLÓN GENERAL DE MENSAJES (BROADCAST)
// =============================================

// Escuchar nuevos mensajes en tiempo real
socket.on('mensaje-general', (mensaje) => {
    const contenedor = document.getElementById('chatGeneralMensajes');
    if (!contenedor) return;
    
    // Quitar estado vacío si existe
    const emptyState = contenedor.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    // Obtener mi ID si es posible para saber si el mensaje es mio
    let miNombre = document.getElementById('usuarioNombre')?.textContent?.replace('Dr. ', '') || '';
    if (miNombre === 'Admin') miNombre = 'Administrador'; // Ajuste simple
    if (miNombre === 'Recepcionista') miNombre = 'Recepción'; // Ajuste simple
    
    const esMio = mensaje.emisor_nombre === miNombre || (mensaje.emisor_nombre && miNombre.includes(mensaje.emisor_nombre));
    
    const div = document.createElement('div');
    div.className = `chat-msg ${esMio ? 'mine' : 'others'}`;
    
    // Formatear hora
    const d = new Date(mensaje.fecha_envio || new Date());
    const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <div class="msg-header">
            <span class="msg-name">${mensaje.emisor_nombre || 'Usuario'} <span class="msg-role ${mensaje.emisor_rol}">${mensaje.emisor_rol}</span></span>
            <span class="msg-time">${hora}</span>
        </div>
        <div class="msg-content">${mensaje.mensaje}</div>
    `;
    
    contenedor.appendChild(div);
    contenedor.scrollTop = contenedor.scrollHeight;
});

// Cargar historial de mensajes al entrar
async function cargarMensajesGenerales() {
    const contenedor = document.getElementById('chatGeneralMensajes');
    if (!contenedor) return;

    try {
        const res = await fetch('/api/mensajes');
        const mensajes = await res.json();
        
        contenedor.innerHTML = '';
        if (mensajes.length === 0) {
            contenedor.innerHTML = '<div class="empty-state">No hay mensajes en el tablón general.</div>';
            return;
        }

        let miNombre = document.getElementById('usuarioNombre')?.textContent?.replace('Dr. ', '') || '';
        if (miNombre === 'Admin') miNombre = 'Administrador'; 
        if (miNombre === 'Recepcionista') miNombre = 'Recepción'; 

        mensajes.forEach(mensaje => {
            const esMio = mensaje.emisor_nombre === miNombre || (mensaje.emisor_nombre && miNombre.includes(mensaje.emisor_nombre));
            
            const div = document.createElement('div');
            div.className = `chat-msg ${esMio ? 'mine' : 'others'}`;
            
            const d = new Date(mensaje.fecha_envio);
            const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            div.innerHTML = `
                <div class="msg-header">
                    <span class="msg-name">${mensaje.emisor_nombre || 'Usuario'} <span class="msg-role ${mensaje.emisor_rol}">${mensaje.emisor_rol}</span></span>
                    <span class="msg-time">${hora}</span>
                </div>
                <div class="msg-content">${mensaje.mensaje}</div>
            `;
            contenedor.appendChild(div);
        });
        
        contenedor.scrollTop = contenedor.scrollHeight;

    } catch (error) {
        console.error("Error cargando historial de mensajes:", error);
        contenedor.innerHTML = '<div class="empty-state error">Error al cargar el historial</div>';
    }
}

// Enviar un nuevo mensaje General
async function enviarMensajeGeneral() {
    const input = document.getElementById('chatInputExtra');
    if (!input) return;
    
    const texto = input.value.trim();
    if (!texto) return;

    try {
        const res = await fetch('/api/mensajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: texto })
        });

        if (res.ok) {
            input.value = ''; // Limpiar textarea al enviar
        } else {
            console.error("Error enviando mensaje");
        }
    } catch (error) {
        console.error("Error de conexion al enviar:", error);
    }
}

// Auto-inicializar (Si el elemento existe en la pagina)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(document.getElementById('chatGeneralMensajes')) {
            cargarMensajesGenerales(); // Cargar historial la primera vez
        }
    }, 500);
});
