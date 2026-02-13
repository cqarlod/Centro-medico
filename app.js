const express = require("express");
const session = require("express-session");
const path = require("path");

require("dotenv").config();

const app = express();

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
// ARCHIVOS ESTÁTICOS
// =====================
app.use(express.static("public"));

// =====================
// REDIRECCIONES - SOLO ESTO ES NUEVO
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

app.use("/session", require("./routes/session.routes"));


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
// SERVIDOR
// =====================
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});