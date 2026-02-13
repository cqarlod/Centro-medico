const form = document.getElementById("loginForm");
const mensaje = document.getElementById("mensaje");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const correo = document.getElementById("correo").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ correo, password })
    });

    const data = await response.json();


    if (!response.ok) {
      mensaje.textContent = data.message;
      mensaje.style.color = "red";
      return;
    }

    mensaje.textContent = "Login exitoso";
    mensaje.style.color = "green";

    const rol = data.usuario.rol.toLowerCase();

    if (rol === "admin") {
     window.location.href = "/admin/dashboard";
  } 
  else if (rol === "doctor") {
   window.location.href = "/doctor/dashboard";
  } 
  else if (rol === "recepcionista") {
   window.location.href = "/recepcionista/dashboard";
  } 
  else {
   alert("Rol no válido en el sistema");
  }


  } catch (error) {
    mensaje.textContent = "Error de conexión";
    mensaje.style.color = "red";
  }
});
