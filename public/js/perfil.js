// Cargar datos
fetch("/session/me")
  .then(res => res.json())
  .then(data => {
    document.getElementById("nombre").textContent = data.nombre;
    document.getElementById("correo").textContent = data.correo || "";
    document.getElementById("rol").textContent = data.rol;
  });

// Cambiar contraseña
document.getElementById("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const actual = document.getElementById("actual").value;
  const nueva = document.getElementById("nueva").value;

  const res = await fetch("/auth/cambiar-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actual, nueva })
  });

  const data = await res.json();
  alert(data.message);
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/login.html";
});

// Mostrar foto
fetch("/session/me")
  .then(res => res.json())
  .then(data => {
    document.getElementById("nombre").textContent = data.nombre;
    document.getElementById("correo").textContent = data.correo;
    document.getElementById("rol").textContent = data.rol;

    if (data.foto) {
      document.getElementById("fotoPerfil").src = data.foto;
    }
  });

// Subir foto
document.getElementById("fotoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  const res = await fetch("/auth/subir-foto", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (data.foto) {
    document.getElementById("fotoPerfil").src = data.foto;
  }

  alert(data.message);
});
