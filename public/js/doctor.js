// public/js/doctor.js
console.log("doctor.js cargado correctamente");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
let calendar;
let doctorData = {};
let pacienteActual = null; // Para el historial

// WEBSOCKETS RE-IMPLEMENTACION
let myDoctorId = null;

// Toggle sidebar
menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

// Cerrar sidebar al hacer clic fuera
document.addEventListener("click", function (event) {
  const isClickInsideSidebar = sidebar.contains(event.target);
  const isClickOnMenuButton = menuBtn.contains(event.target);

  if (!isClickInsideSidebar && !isClickOnMenuButton) {
    sidebar.classList.remove("open");
  }
});

// Mostrar seccion
function mostrarSeccion(id) {
  document.querySelectorAll(".seccion").forEach(sec => {
    sec.classList.remove("activa");
  });
  document.getElementById(id).classList.add("activa");
  
  document.querySelectorAll(".sidebar li").forEach(li => {
    li.classList.remove("active");
  });
  event.currentTarget.classList.add("active");
  
  sidebar.classList.remove("open");
}

// Toast notification
function mostrarToast(mensaje, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.className = `toast ${tipo}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Cerrar sesion
function cerrarSesion() {
  window.location.href = "/session/logout";
}

// Cargar datos del doctor
async function cargarDatosDoctor() {
  try {
    const res = await fetch("/api/doctor/perfil");
    if (!res.ok) throw new Error("Error al cargar perfil");
    
    doctorData = await res.json();
    document.getElementById("usuarioNombre").textContent = "Dr. " + doctorData.nombre;
    myDoctorId = doctorData.doctor_id; // <- Corregido de .id a .doctor_id

    // Iniciar Websocket al estar autenticado
    iniciarRecibidorCitasEnVivo();
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al cargar datos del doctor", "error");
  }
}

// =============================================
// FUNCIONES NOTIFICACION EN TIEMPO REAL
// =============================================
let notificacionesPendientes = 0;

// Obtener elementos del DOM
document.addEventListener("DOMContentLoaded", () => {
  const btnCampana = document.getElementById("btnCampana");
  const panelNotificaciones = document.getElementById("panelNotificaciones");
  
  if (btnCampana && panelNotificaciones) {
    // Abrir/cerrar panel al hacer click en la campana
    btnCampana.addEventListener("click", (e) => {
      // Evitar que el click se propague si hacemos click en un boton dentro del panel
      if(e.target.tagName === 'BUTTON' || e.target.parentElement.tagName === 'BUTTON') return;
      panelNotificaciones.classList.toggle("show");
    });
    
    // Cerrar panel al hacer click fuera de el
    document.addEventListener("click", (e) => {
      if (!btnCampana.contains(e.target)) {
        panelNotificaciones.classList.remove("show");
      }
    });
  }
});

function actualizarContadorNotificaciones(cambio) {
  notificacionesPendientes += cambio;
  if (notificacionesPendientes < 0) notificacionesPendientes = 0;
  
  const badge = document.getElementById("contadorNotif");
  const lista = document.getElementById("listaNotificaciones");
  
  if(badge) {
    badge.textContent = notificacionesPendientes;
    badge.style.display = notificacionesPendientes > 0 ? "flex" : "none";
  }
  
  if(notificacionesPendientes === 0 && lista) {
    lista.innerHTML = '<div class="notif-empty">No hay pacientes en espera</div>';
  }
}

function iniciarRecibidorCitasEnVivo() {
  if (typeof socket === 'undefined' || !myDoctorId) return;

  socket.on(`doctor-${myDoctorId}`, (data) => {
      const lista = document.getElementById('listaNotificaciones');
      if(!lista) return;
      
      const safeId = data.paciente.replace(/\s+/g, '-');
      
      // Si habia un empty state, limpiarlo
      if(notificacionesPendientes === 0) {
        lista.innerHTML = '';
      }
      
      const nuevaAlerta = `
          <div class="notif-item" id="notif-${safeId}">
              <div class="notif-title"><i class="fas fa-user"></i> ${data.paciente}</div>
              <div class="notif-desc">Acaba de llegar a recepcion.</div>
              <button class="btn-primary small" style="width:100%;" onclick="confirmarPasoUI(event, '${data.paciente.replace(/'/g, "\\'")}', ${data.recepcionistaId}, '${safeId}')">
                <i class="fas fa-check-circle"></i> Autorizar Paso
              </button>
          </div>
      `;
      // Agregar la notificacion arriba de las demas
      lista.insertAdjacentHTML('afterbegin', nuevaAlerta);
      
      // Aumentar contador
      actualizarContadorNotificaciones(1);
      
      // Sonido
      try {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
      } catch (e) {}
  });
}

window.confirmarPasoUI = function(event, nombre, recepId, divId) {
    // Evitar propagacion al dropdown
    if (event) event.stopPropagation();
    
    // Enviar evento de confirmacion por websockets
    if (typeof responderAlPaso !== 'undefined') {
        responderAlPaso(nombre, recepId);
    }
    
    // Remover item visualmente del panel
    const item = document.getElementById(`notif-${divId}`);
    if (item) {
        item.style.opacity = '0';
        setTimeout(() => {
            item.remove();
            actualizarContadorNotificaciones(-1);
        }, 300);
    }
};

// =============================================
// FUNCIONES DE DEPURACION PARA EL CALENDARIO
// =============================================

// Inicializar calendario con logs
function inicializarCalendario() {
  console.log("1. Iniciando inicializarCalendario()");
  const calendarEl = document.getElementById('calendario-doctor');
  console.log("2. Elemento calendario-doctor:", calendarEl);
  
  if (!calendarEl) {
    console.error("3. ERROR: No se encontró el elemento calendario-doctor");
    return;
  }
  
  console.log("4. Creando instancia de FullCalendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: 'es',
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día'
    },
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
    slotDuration: '00:30:00',
    height: 'auto',
    events: cargarEventosCalendarioDoctor,
    eventClick: function(info) {
      console.log("Evento click:", info.event);
      abrirModalNota(info.event);
    },
    loading: function(isLoading) {
      console.log("Loading state:", isLoading);
    }
  });
  
  console.log("5. Renderizando calendario");
  calendar.render();
  console.log("6. Calendario renderizado");
}

// Función para calcular hora fin (30 minutos después) - MEJORADA
function calcularHoraFin(fecha, hora) {
  if (!fecha || !hora) return null;
  
  // Asegurar que hora tenga formato HH:MM:SS
  let horaCompleta = hora;
  if (hora.length === 5) {
    horaCompleta = hora + ':00';
  }
  
  // Crear fecha ISO completa
  const fechaHoraStr = `${fecha}T${horaCompleta}`;
  const fechaFin = new Date(fechaHoraStr);
  fechaFin.setMinutes(fechaFin.getMinutes() + 30);
  
  // Devolver en formato ISO
  return fechaFin.toISOString();
}

// Cargar eventos para el calendario del doctor con colores brillantes
async function cargarEventosCalendarioDoctor(fetchInfo, successCallback, failureCallback) {
  console.log("7. cargarEventosCalendarioDoctor() llamado");
  console.log("8. Rango fetchInfo:", fetchInfo.startStr, "a", fetchInfo.endStr);
  
  try {
    const fechaInicio = fetchInfo.startStr.split('T')[0];
    const fechaFin = fetchInfo.endStr.split('T')[0];
    
    console.log("9. Fechas formateadas:", fechaInicio, "a", fechaFin);
    
    const url = `/api/doctor/citas-calendario?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    console.log("10. URL completa:", url);
    
    console.log("11. Haciendo fetch...");
    const res = await fetch(url);
    console.log("12. Respuesta status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("13. Error en respuesta:", errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const citas = await res.json();
    console.log("14. Citas recibidas:", citas);
    console.log("15. Número de citas:", citas.length);
    
    if (citas.length === 0) {
      console.log("16. No hay citas, enviando array vacío");
      successCallback([]);
      return;
    }
    
    const eventos = citas.map((c, index) => {
      console.log(`17. Procesando cita ${index + 1}:`, c);
      
      // =============================================
      // PROCESAR FECHA - VERSIÓN CORREGIDA
      // =============================================
      let fechaStr;
      console.log("Fecha original:", c.fecha);

      // Si viene como objeto Date de PostgreSQL
      if (c.fecha && typeof c.fecha === 'object' && c.fecha.toISOString) {
        const d = new Date(c.fecha);
        // Extraer YYYY-MM-DD manualmente para evitar problemas de zona horaria
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        fechaStr = `${year}-${month}-${day}`;
        console.log(`Fecha convertida manualmente: ${fechaStr}`);
      } 
      // Si viene como string ISO
      else if (typeof c.fecha === 'string' && c.fecha.includes('T')) {
        // Tomar solo la parte de la fecha YYYY-MM-DD
        fechaStr = c.fecha.split('T')[0];
        console.log(`Fecha extraída de ISO: ${fechaStr}`);
      }
      // Si ya está en formato YYYY-MM-DD
      else if (typeof c.fecha === 'string' && c.fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fechaStr = c.fecha;
        console.log(`Fecha ya en formato correcto: ${fechaStr}`);
      }
      // Último recurso
      else {
        fechaStr = '2026-01-01';
        console.log("Fecha desconocida, usando default:", c.fecha);
      }
      
      // Procesar hora
      let horaStr = c.hora;
      if (horaStr && horaStr.length === 5) {
        horaStr = horaStr + ':00';
        console.log(`Hora formateada: ${horaStr}`);
      }
      
      // COLORES NORMALES
      let color;
      if (c.estado === 'Programada') {
        color = '#0a3b5c'; 
      } else if (c.estado === 'Atendida') {
        color = '#28a745'; 
      } else if (c.estado === 'Cancelada') {
        color = '#dc3545'; 
      } else {
        color = '#0a3b5c'; 
      }
      
      console.log(`Color asignado: ${color}`);
      
      // Calcular hora fin
      const endTime = calcularHoraFin(fechaStr, horaStr);
      console.log(`Hora fin: ${endTime}`);
      
      return {
        id: c.id,
        title: c.paciente,
        start: `${fechaStr}T${horaStr}`,
        end: endTime,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        display: 'auto',
        extendedProps: {
          estado: c.estado,
          paciente: c.paciente,
          telefono: c.paciente_telefono,
          nota: c.nota
        }
      };
    });
    
    console.log("23. Eventos generados:", eventos);
    console.log("24. Llamando a successCallback con", eventos.length, "eventos");
    successCallback(eventos);
    
  } catch (error) {
    console.error("25. ERROR en cargarEventosCalendarioDoctor:", error);
    console.error("26. Stack:", error.stack);
    failureCallback(error);
  }
}

// Función para colores por estado (la original, la dejamos por si acaso)
function colorPorEstado(estado) {
  switch(estado) {
    case 'Programada': return '#0a3b5c';
    case 'Atendida': return '#28a745';
    case 'Cancelada': return '#dc3545';
    default: return '#0a3b5c';
  }
}

// Cargar estadisticas
async function cargarEstadisticas() {
  try {
    const res = await fetch("/api/doctor/estadisticas");
    const stats = await res.json();
    
    document.getElementById("totalHoy").textContent = stats.total_hoy || 0;
    document.getElementById("atendidasHoy").textContent = stats.atendidas_hoy || 0;
    document.getElementById("pendientesHoy").textContent = stats.pendientes_hoy || 0;
    document.getElementById("proximasCitas").textContent = stats.proximas || 0;
    
  } catch (error) {
    console.error("Error cargando estadisticas:", error);
  }
}

// Cargar lista de citas
async function cargarListaCitas() {
  try {
    const fecha = document.getElementById("filtroFecha").value;
    const estado = document.getElementById("filtroEstado").value;
    
    let url = "/api/doctor/citas?";
    if (fecha) url += `fecha=${fecha}&`;
    if (estado && estado !== 'todos') url += `estado=${estado}&`;
    
    const res = await fetch(url);
    const citas = await res.json();
    
    const tbody = document.getElementById("tablaCitas");
    
    if (citas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay citas</td></tr>`;
      return;
    }
    
    tbody.innerHTML = citas.map(c => `
      <tr>
        <td>${new Date(c.fecha).toLocaleDateString()}</td>
        <td>${c.hora.substring(0,5)}</td>
        <td>${c.paciente}</td>
        <td>${c.paciente_telefono || '-'}</td>
        <td><span class="badge ${c.estado}">${c.estado}</span></td>
        <td>
          <button onclick="abrirModalReprogramar(${c.id})" class="btn-icon blue small" title="Reprogramar">
            <i class="fas fa-calendar-alt"></i>
          </button>
          <button onclick="cambiarEstado(${c.id}, 'Atendida')" class="btn-icon green small" title="Marcar atendida">
            <i class="fas fa-check"></i>
          </button>
          <button onclick="abrirModalNota({id: ${c.id}, extendedProps: {nota: '${c.nota || ''}'}})" class="btn-icon yellow small" title="Nota">
            <i class="fas fa-sticky-note"></i>
          </button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error("Error cargando citas:", error);
    mostrarToast("Error al cargar citas", "error");
  }
}

// Cambiar estado
async function cambiarEstado(id, nuevoEstado) {
  if (!confirm(`Marcar como ${nuevoEstado}?`)) return;
  
  try {
    const res = await fetch(`/api/doctor/citas/${id}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    
    if (res.ok) {
      mostrarToast(`Cita marcada como ${nuevoEstado}`, "success");
      calendar.refetchEvents();
      cargarListaCitas();
      cargarEstadisticas();
    } else {
      const error = await res.json();
      mostrarToast(error.message, "error");
    }
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al actualizar", "error");
  }
}

// Variables globales para modales
window.abrirModalReprogramar = function(citaId) {
  document.getElementById("reprogramarCitaId").value = citaId;
  document.getElementById("modalReprogramar").style.display = "block";
};

window.abrirModalNota = function(event) {
  document.getElementById("notaCitaId").value = event.id;
  document.getElementById("notaTexto").value = event.extendedProps?.nota || '';
  document.getElementById("modalNota").style.display = "block";
};

// Event listeners para modales
document.getElementById("formReprogramar").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = document.getElementById("reprogramarCitaId").value;
  const fecha = document.getElementById("nuevaFecha").value;
  const hora = document.getElementById("nuevaHora").value;
  
  try {
    const res = await fetch(`/api/doctor/citas/${id}/reprogramar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha, hora })
    });
    
    if (res.ok) {
      mostrarToast("Cita reprogramada", "success");
      document.getElementById("modalReprogramar").style.display = "none";
      calendar.refetchEvents();
      cargarListaCitas();
    } else {
      const error = await res.json();
      mostrarToast(error.message, "error");
    }
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al reprogramar", "error");
  }
});

document.getElementById("formNota").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = document.getElementById("notaCitaId").value;
  const nota = document.getElementById("notaTexto").value;
  
  try {
    const res = await fetch(`/api/doctor/citas/${id}/nota`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota })
    });
    
    if (res.ok) {
      mostrarToast("Nota guardada", "success");
      document.getElementById("modalNota").style.display = "none";
      calendar.refetchEvents();
    } else {
      const error = await res.json();
      mostrarToast(error.message, "error");
    }
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al guardar nota", "error");
  }
});

// =============================================
// FUNCIONES PARA EL HISTORIAL DEL PACIENTE
// =============================================

// Abrir historial del paciente
window.verHistorial = async function(pacienteId, pacienteNombre) {
  try {
    console.log("Cargando historial del paciente:", pacienteId);
    
    // Mostrar modal
    document.getElementById("modalHistorial").style.display = "block";
    document.getElementById("historialCitas").innerHTML = '<tr><td colspan="4" class="text-center">Cargando historial...</td></tr>';
    
    // Limpiar datos anteriores
    document.getElementById("pacienteNombre").textContent = "Cargando...";
    document.getElementById("pacienteTelefono").textContent = "-";
    document.getElementById("pacienteCorreo").textContent = "-";
    document.getElementById("pacienteNacimiento").textContent = "-";
    
    // Hacer fetch al historial
    const res = await fetch(`/api/doctor/pacientes/${pacienteId}/historial`);
    
    if (!res.ok) {
      throw new Error("Error al cargar historial");
    }
    
    const data = await res.json();
    console.log("Historial recibido:", data);
    
    // Mostrar datos del paciente
    document.getElementById("pacienteNombre").textContent = data.paciente.nombre;
    document.getElementById("pacienteTelefono").textContent = data.paciente.telefono || "No registrado";
    document.getElementById("pacienteCorreo").textContent = data.paciente.correo || "No registrado";
    
    if (data.paciente.fecha_nacimiento) {
      const fecha = new Date(data.paciente.fecha_nacimiento);
      document.getElementById("pacienteNacimiento").textContent = fecha.toLocaleDateString();
    } else {
      document.getElementById("pacienteNacimiento").textContent = "No registrado";
    }
    
    // Mostrar historial de citas
    if (data.citas.length === 0) {
      document.getElementById("historialCitas").innerHTML = `
        <tr>
          <td colspan="4" class="text-center">No hay citas previas con este paciente</td>
        </tr>
      `;
    } else {
      document.getElementById("historialCitas").innerHTML = data.citas.map(c => `
        <tr>
          <td>${new Date(c.fecha).toLocaleDateString()}</td>
          <td>${c.hora.substring(0,5)}</td>
          <td><span class="badge ${c.estado}">${c.estado}</span></td>
          <td>${c.nota || '-'}</td>
        </tr>
      `).join('');
    }
    
  } catch (error) {
    console.error("Error cargando historial:", error);
    mostrarToast("Error al cargar historial", "error");
  }
};

// Cerrar historial
window.cerrarHistorial = function() {
  document.getElementById("modalHistorial").style.display = "none";
};

// Cerrar modales (incluyendo el nuevo)
document.querySelectorAll(".close").forEach(btn => {
  btn.addEventListener("click", function() {
    this.closest(".modal").style.display = "none";
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});

// Cargar pacientes (MODIFICADO para incluir botón de historial)
async function cargarPacientes() {
  try {
    const res = await fetch("/api/doctor/citas");
    const citas = await res.json();
    
    const pacientesUnicos = [];
    const idsVistos = new Set();
    
    citas.forEach(c => {
      if (!idsVistos.has(c.paciente_id)) {
        idsVistos.add(c.paciente_id);
        pacientesUnicos.push(c);
      }
    });
    
    const grid = document.getElementById("listaPacientes");
    
    if (pacientesUnicos.length === 0) {
      grid.innerHTML = '<div class="empty-state">No hay pacientes</div>';
      return;
    }
    
    grid.innerHTML = pacientesUnicos.map(p => `
      <div class="paciente-card">
        <div class="paciente-info">
          <strong>${p.paciente}</strong>
          <span><i class="fas fa-phone"></i> ${p.paciente_telefono || 'No registrado'}</span>
        </div>
        <button onclick="verHistorial(${p.paciente_id}, '${p.paciente}')" class="btn-icon blue small" title="Ver historial">
          <i class="fas fa-notes-medical"></i>
        </button>
      </div>
    `).join('');
    
    // Buscador
    document.getElementById("buscarPaciente").addEventListener("input", (e) => {
      const termino = e.target.value.toLowerCase();
      const cards = document.querySelectorAll('.paciente-card');
      
      cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(termino) ? 'flex' : 'none';
      });
    });
    
  } catch (error) {
    console.error("Error cargando pacientes:", error);
  }
}

// Inicializar
window.onload = async () => {
  await cargarDatosDoctor();
  inicializarCalendario();
  await cargarEstadisticas();
  await cargarListaCitas();
  await cargarPacientes();
};

// Hacer funciones globales
window.mostrarSeccion = mostrarSeccion;
window.cerrarSesion = cerrarSesion;
window.cargarListaCitas = cargarListaCitas;
window.cambiarEstado = cambiarEstado;
window.abrirModalReprogramar = abrirModalReprogramar;
window.abrirModalNota = abrirModalNota;