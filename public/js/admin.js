// public/js/admin.js
console.log("admin.js cargado correctamente");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
let graficoUsuarios = null;

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
  
  if (id === 'dashboard') {
    cargarEstadisticas();
  } else if (id === 'usuarios') {
    cargarUsuarios();
  } else if (id === 'citas') {
    cargarTodasLasCitas();
  }
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

// =============================================
// FUNCIONES DE ESTADISTICAS
// =============================================
async function cargarEstadisticas() {
  try {
    const res = await fetch("/api/admin/estadisticas");
    const stats = await res.json();
    
    document.getElementById("totalUsuarios").textContent = stats.total_usuarios || 0;
    document.getElementById("totalDoctores").textContent = stats.total_doctores || 0;
    document.getElementById("totalRecepcionistas").textContent = stats.total_recepcionistas || 0;
    document.getElementById("citasHoy").textContent = stats.citas_hoy || 0;
    
    // Crear gráfico
    if (graficoUsuarios) {
      graficoUsuarios.destroy();
    }
    
    const ctx = document.getElementById('graficoUsuarios').getContext('2d');
    graficoUsuarios = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Administradores', 'Doctores', 'Recepcionistas'],
        datasets: [{
          data: [
            stats.total_admins || 0,
            stats.total_doctores || 0,
            stats.total_recepcionistas || 0
          ],
          backgroundColor: ['#0a3b5c', '#28a745', '#ff9800']
        }
      ]},
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 12 }
            }
          }
        }
      }
    });
    
  } catch (error) {
    console.error("Error cargando estadisticas:", error);
    mostrarToast("Error al cargar estadísticas", "error");
  }
}

// =============================================
// FUNCIONES DE USUARIOS
// =============================================
async function cargarUsuarios() {
  try {
    const res = await fetch("/api/admin/usuarios");
    const usuarios = await res.json();
    
    const tbody = document.getElementById("tablaUsuarios");
    
    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay usuarios</td></tr>';
      return;
    }
    
    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.nombre}</td>
        <td>${u.correo}</td>
        <td><span class="badge ${u.rol}">${u.rol}</span></td>
        <td>${u.especialidad || '-'}</td>
        <td>
          <button onclick="editarUsuario(${u.id})" class="btn-icon blue small" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="resetPassword(${u.id})" class="btn-icon yellow small" title="Resetear contraseña">
            <i class="fas fa-key"></i>
          </button>
          <button onclick="eliminarUsuario(${u.id})" class="btn-icon red small" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    mostrarToast("Error al cargar usuarios", "error");
  }
}

// Mostrar/ocultar campo de especialidad según rol
function toggleEspecialidad() {
  const rol = document.getElementById("usuarioRol").value;
  const especialidadGroup = document.getElementById("especialidadGroup");
  
  if (rol === 'doctor') {
    especialidadGroup.style.display = 'block';
    document.getElementById("usuarioEspecialidad").required = true;
  } else {
    especialidadGroup.style.display = 'none';
    document.getElementById("usuarioEspecialidad").required = false;
    document.getElementById("usuarioEspecialidad").value = '';
  }
}

// Limpiar formulario de usuario
function limpiarFormularioUsuario() {
  document.getElementById("formUsuario").reset();
  document.getElementById("usuarioId").value = "";
  document.getElementById("passwordGroup").style.display = 'block';
  document.getElementById("usuarioPassword").required = true;
  document.getElementById("especialidadGroup").style.display = 'none';
  document.getElementById("usuarioEspecialidad").required = false;
}

// Abrir modal para nuevo usuario
function abrirModalUsuario() {
  document.getElementById("modalUsuarioTitulo").textContent = "Nuevo Usuario";
  limpiarFormularioUsuario();
  document.getElementById("modalUsuario").style.display = "block";
}

// Cerrar modal de usuario
function cerrarModalUsuario() {
  document.getElementById("modalUsuario").style.display = "none";
  limpiarFormularioUsuario();
}

// Editar usuario
async function editarUsuario(id) {
  try {
    // Obtener datos del usuario
    const res = await fetch("/api/admin/usuarios");
    const usuarios = await res.json();
    const usuario = usuarios.find(u => u.id === id);
    
    if (!usuario) {
      mostrarToast("Usuario no encontrado", "error");
      return;
    }
    
    document.getElementById("modalUsuarioTitulo").textContent = "Editar Usuario";
    document.getElementById("usuarioId").value = usuario.id;
    document.getElementById("usuarioNombre").value = usuario.nombre;
    document.getElementById("usuarioCorreo").value = usuario.correo;
    document.getElementById("usuarioRol").value = usuario.rol;
    document.getElementById("usuarioPassword").required = false;
    
    if (usuario.rol === 'doctor') {
      document.getElementById("especialidadGroup").style.display = 'block';
      document.getElementById("usuarioEspecialidad").value = usuario.especialidad || '';
      document.getElementById("usuarioEspecialidad").required = true;
    } else {
      document.getElementById("especialidadGroup").style.display = 'none';
      document.getElementById("usuarioEspecialidad").required = false;
    }
    
    document.getElementById("modalUsuario").style.display = "block";
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al cargar usuario", "error");
  }
}

// Resetear contraseña
async function resetPassword(id) {
  const nuevaPassword = prompt("Ingrese la nueva contraseña para el usuario:");
  
  if (!nuevaPassword) return;
  
  if (nuevaPassword.length < 6) {
    mostrarToast("La contraseña debe tener al menos 6 caracteres", "error");
    return;
  }
  
  try {
    const res = await fetch(`/api/admin/usuarios/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nuevaPassword })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarToast("Contraseña actualizada", "success");
    } else {
      mostrarToast(data.message, "error");
    }
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al resetear contraseña", "error");
  }
}

// Eliminar usuario
async function eliminarUsuario(id) {
  if (!confirm("¿Está seguro de eliminar este usuario?")) return;
  
  try {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: "DELETE"
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarToast("Usuario eliminado", "success");
      cargarUsuarios();
      cargarEstadisticas();
    } else {
      mostrarToast(data.message, "error");
    }
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al eliminar usuario", "error");
  }
}

// Event listener para el formulario de usuario
document.getElementById("formUsuario").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = document.getElementById("usuarioId").value;
  const nombre = document.getElementById("usuarioNombre").value;
  const correo = document.getElementById("usuarioCorreo").value;
  const password = document.getElementById("usuarioPassword").value;
  const rol = document.getElementById("usuarioRol").value;
  const especialidad = document.getElementById("usuarioEspecialidad").value;
  
  const esEdicion = id !== "";
  
  // Validaciones
  if (!esEdicion && !password) {
    mostrarToast("La contraseña es requerida", "error");
    return;
  }
  
  if (rol === 'doctor' && !especialidad) {
    mostrarToast("La especialidad es requerida para doctores", "error");
    return;
  }
  
  try {
    let url = "/api/admin/usuarios";
    let method = "POST";
    
    if (esEdicion) {
      url += `/${id}`;
      method = "PUT";
    }
    
    // 🔴 SOLUCIÓN: Construir objeto dinámicamente
    const datos = {
      nombre: nombre,
      correo: correo,
      rol: rol
    };
    
    // Solo agregar password si es nuevo usuario o si se proporcionó
    if (password) {
      datos.password = password;
    }
    
    // Solo agregar especialidad si es doctor
    if (rol === 'doctor') {
      datos.especialidad = especialidad;
    }
    
    console.log("Enviando datos:", datos); // Para depurar
    
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      mostrarToast(esEdicion ? "Usuario actualizado" : "Usuario creado", "success");
      cerrarModalUsuario();
      cargarUsuarios();
      cargarEstadisticas();
    } else {
      mostrarToast(data.message || "Error", "error");
      console.error("Error del servidor:", data);
    }
    
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("Error al guardar usuario", "error");
  }
});

// =============================================
// FUNCIONES DE CITAS
// =============================================
async function cargarTodasLasCitas() {
  try {
    const fecha = document.getElementById("filtroFechaAdmin").value;
    const estado = document.getElementById("filtroEstadoAdmin").value;
    
    let url = "/api/admin/citas?";
    if (fecha) url += `fecha=${fecha}&`;
    if (estado && estado !== 'todos') url += `estado=${estado}&`;
    
    const res = await fetch(url);
    const citas = await res.json();
    
    const tbody = document.getElementById("tablaTodasCitas");
    
    if (citas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay citas</td></tr>`;
      return;
    }
    
    tbody.innerHTML = citas.map(c => `
      <tr>
        <td>${new Date(c.fecha).toLocaleDateString()}</td>
        <td>${c.hora.substring(0,5)}</td>
        <td>${c.paciente}</td>
        <td>${c.doctor}</td>
        <td><span class="badge ${c.estado}">${c.estado}</span></td>
        <td>${c.nota || '-'}</td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error("Error cargando citas:", error);
    mostrarToast("Error al cargar citas", "error");
  }
}

// =============================================
// EVENTOS PARA CERRAR MODALES
// =============================================
// Cerrar modal con la X
document.querySelectorAll("#modalUsuario .close").forEach(btn => {
  btn.addEventListener("click", cerrarModalUsuario);
});

// Cerrar modal haciendo clic fuera
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    cerrarModalUsuario();
  }
});

// =============================================
// INICIALIZACIÓN
// =============================================
window.onload = async () => {
  // Cargar datos del usuario
  try {
    const res = await fetch("/check-session");
    const data = await res.json();
    if (data.autenticado) {
      document.getElementById("nombreUsuarioNavbar").textContent = data.usuario.nombre;
    }
  } catch (error) {
    console.error("Error cargando usuario:", error);
  }
  
  // Cargar estadísticas iniciales
  await cargarEstadisticas();
};

// Hacer funciones globales
window.mostrarSeccion = mostrarSeccion;
window.cerrarSesion = cerrarSesion;
window.abrirModalUsuario = abrirModalUsuario;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.resetPassword = resetPassword;
window.cerrarModalUsuario = cerrarModalUsuario;
window.toggleEspecialidad = toggleEspecialidad;
window.cargarTodasLasCitas = cargarTodasLasCitas;