const express = require("express");
const session = require("express-session");
const path = require("path");
const http = require("http"); // Agregado
const { Server } = require("socket.io"); // Agregado

require("dotenv").config();

const app = express();
const server = http.createServer(app); // Agregado
const io = new Server(server); // Agregado

// =====================
// MIDDLEWARES GENERALES
// =====================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "centro_medico_secret",
    resave: false,
    saveUninitialized: false
  })
);

// =====================
// LÓGICA DE TIEMPO REAL (SOCKET.IO)
// =====================
io.on('connection', (socket) => {
  console.log('Usuario conectado al sistema de alertas:', socket.id);

  // 1. Recepcionista notifica al doctor
  socket.on('notificar-paciente', (data) => {
    // 'data' contiene { paciente, doctorId, recepcionistaId }
    console.log(`Notificando a Doctor ID: ${data.doctorId}`);
    // Enviamos la alerta específicamente al canal de ese doctor
    io.emit(`doctor-${data.doctorId}`, data);
  });

  // 2. Doctor autoriza el paso
  socket.on('autorizar-paso', (data) => {
    console.log(`Doctor autorizó a: ${data.paciente}`);
    // Regresamos la confirmación a la recepcionista
    io.emit(`recepcion-${data.recepcionistaId}`, data);
  });
});

// =====================
// ARCHIVOS ESTÁTICOS
// =====================
app.use(express.static("public"));

// =====================
// REDIRECCIONES - SOLO ESTO ES NUEVO
// =====================
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.get("/recepcionista/dashboard.html", (req, res) => {
  res.redirect("/recepcionista/dashboard");
});

app.get("/admin/dashboard.html", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.get("/doctor/dashboard.html", (req, res) => {
  res.redirect("/doctor/dashboard");
});

// =====================
// IMPORTS DE RUTAS
// =====================
const authRoutes = require("./routes/auth.routes");

const {
  isAuthenticated,
  hasRole
} = require("./middlewares/auth.middleware");

const recepcionRoutes = require("./routes/recepcion.routes");
app.use("/api/recepcion", recepcionRoutes);


// =====================
// RUTAS
// =====================
app.use("/auth", authRoutes);
app.use("/session", require("./routes/session.routes"));


// Rutas protegidas por rol
app.get(
  "/admin/dashboard",
  isAuthenticated,
  hasRole("admin"),
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "views/admin/dashboard.html")
    );
  }
);

app.get(
  "/doctor/dashboard",
  isAuthenticated,
  hasRole("doctor"),
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "views/doctor/dashboard.html")
    );
  }
);


app.get(
  "/recepcionista/dashboard",
  isAuthenticated,
  hasRole("recepcionista"),
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "views/recepcionista/dashboard.html")
    );
  }
);

app.get(
  "/perfil",
  isAuthenticated,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "views/perfil/perfil.html")
    );
  }
);

// Ruta de prueba
app.get("/test", (req, res) => {
  res.send("Ruta test OK");
});

// =====================
// SERVIDOR (Cambiamos app.listen por server.listen)
// =====================
server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});