const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { autorizarRol } = require("../middlewares/role.middleware");

router.get("/admin", autorizarRol("admin"), (req, res) => {
  res.json({ message: "Bienvenido Admin" });
});

router.get("/doctor", autorizarRol("doctor"), (req, res) => {
  res.json({ message: "Bienvenido Doctor" });
});

router.get("/paciente", autorizarRol("paciente"), (req, res) => {
  res.json({ message: "Bienvenido Paciente" });
});

module.exports = router;
