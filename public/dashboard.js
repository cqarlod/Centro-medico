document.addEventListener("DOMContentLoaded", () => {
  cargarDoctores();
});

async function cargarDoctores() {
  // temporal (luego viene del backend)
  const doctores = [
    { id: 1, nombre: "Dr. Juan Pérez" },
    { id: 2, nombre: "Dra. Ana López" }
  ];

  const select = document.getElementById("doctor");

  doctores.forEach(doc => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.nombre;
    select.appendChild(option);
  });
}

document.getElementById("formCita").addEventListener("submit", (e) => {
  e.preventDefault();

  alert("Cita registrada (simulada)");
});
