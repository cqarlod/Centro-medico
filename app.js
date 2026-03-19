const express = require("express");
const session = require("express-session");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.set('socketio', io);

// =====================
// MIDDLEWARES GENERALES
// =====================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuracion de sesion mejorada
app.use(
  session({
    secret: "centro_medico_secret",
    resave: true,
    saveUninitialized: true,
    rolling: true,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
      sameSite: 'lax'
    }
  })
);

// =====================
// ARCHIVOS ESTATICOS
// =====================
app.use(express.static("public"));

// =====================
// REDIRECCIONES
// =====================
app.get("/recepcionista/dashboard.html", (req, res) => {
  res.redirect("/recepcionista/dashboard");
});

app.get("/admin/dashboard.html", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.get("/doctor/dashboard.html", (req, res) => {
  res.redirect("/doctor/dashboard");
});

app.get("/login.html", (req, res) => {
  res.redirect("/auth/login");
});

// =====================
// REDIRECCIÓN DE LA RAÍZ
// =====================
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// =====================
// IMPORTS DE RUTAS
// =====================
const authRoutes = require("./routes/auth.routes");

const {
  isAuthenticated,
  hasRole
} = require("./middlewares/auth.middleware");

const recepcioRoutes = require("./routes/recepcion.routes");
const doctorRoutes = require("./routes/doctor.routes");
const sessionRoutes = require("./routes/session.routes");
const adminRoutes = require("./routes/admin.routes"); // ✅ NUEVA RUTA DE ADMIN
const mensajesRoutes = require("./routes/mensajes.routes"); // ✅ NUEVA RUTA DE MENSAJES

// =====================
// RUTAS DE API
// =====================
app.use("/auth", authRoutes);
app.use("/session", sessionRoutes);
app.use("/api/recepcion", recepcioRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/admin", adminRoutes); // ✅ NUEVA RUTA DE ADMIN
app.use("/api/mensajes", mensajesRoutes); // ✅ NUEVA RUTA DE MENSAJES

// =====================
// RUTAS PROTEGIDAS POR ROL (VISTAS)
// =====================

// Admin
app.get(
  "/admin/dashboard",
  isAuthenticated,
  hasRole("admin"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "views/admin/dashboard.html"));
  }
);

// Doctor
app.get(
  "/doctor/dashboard",
  isAuthenticated,
  hasRole("doctor"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "views/doctor/dashboard.html"));
  }
);

// Recepcionista
app.get(
  "/recepcionista/dashboard",
  isAuthenticated,
  hasRole("recepcionista"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "views/recepcionista/dashboard.html"));
  }
);

// =====================
// RUTA DE PERFIL - UNIFICADA
// =====================
app.get(
  "/perfil",
  isAuthenticated,
  (req, res) => {
    const usuario = req.session.usuario;
    
    if (!usuario) {
      return res.redirect("/auth/login");
    }
    
    // Un solo archivo de perfil para todos los roles
    res.sendFile(path.join(__dirname, "views/perfil/perfil.html"));
  }
);

// =====================
// RUTA PARA VERIFICAR SESION
// =====================
app.get("/check-session", (req, res) => {
  res.json({
    autenticado: !!req.session.usuario,
    usuario: req.session.usuario || null,
    sessionID: req.sessionID
  });
});

// =====================
// RUTA DE PRUEBA
// =====================
app.get("/test", (req, res) => {
  res.send("Ruta test OK");
});

// =====================
// MANEJO DE ERRORES 404
// =====================
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Pagina no encontrada</h1>
    <p>La ruta ${req.path} no existe</p>
    <a href="/auth/login">Ir al login</a>
  `);
});

// =====================
// WEBSOCKETS (SOCKET.IO)
// =====================
io.on('connection', (socket) => {
  console.log('🔗 Cliente conectado a WebSockets:', socket.id);

  // Cuando la recepcionista avisa llegada
  socket.on('notificar-paciente', (data) => {
      console.log(`🔔 Recepcionista manda paciente ${data.paciente} al Doctor ID: ${data.doctorId}`);
      // Re-emitir evento solo a los doctores correspondientes mediante un room virtual o broadcast filtrable
      io.emit(`doctor-${data.doctorId}`, data);
  });

  // Cuando el doctor autoriza que puede pasar
  socket.on('autorizar-paso', (data) => {
      console.log(`✅ Doctor autorizó el paso a: ${data.paciente} (Avisando a Recepción ID: ${data.recepcionistaId})`);
      io.emit(`recepcion-${data.recepcionistaId}`, data);
  });

  socket.on('disconnect', () => {
      console.log('❌ Cliente desconectado:', socket.id);
  });
});

// =====================
// SERVIDOR
// =====================
server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000/");
});