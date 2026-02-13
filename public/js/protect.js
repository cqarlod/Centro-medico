fetch("/session/me")
  .then(res => {
    if (!res.ok) {
      window.location.href = "/login.html";
      return;
    }
    return res.json();
  })
  .then(data => {
    const rol = data.usuario.rol;

    const page = window.location.pathname;

    if (page.includes("admin") && rol !== "admin") {
      window.location.href = "/login.html";
    }

    if (page.includes("doctor") && rol !== "doctor") {
      window.location.href = "/login.html";
    }

    if (page.includes("recepcion") && rol !== "recepcionista") {
      window.location.href = "/login.html";
    }
  });
