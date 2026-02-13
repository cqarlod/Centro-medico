const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

router.get("/admin", role("admin"), (req, res) => {
  res.json({ message: "Bienvenido Admin" });
});

router.get("/doctor", role("doctor"), (req, res) => {
  res.json({ message: "Bienvenido Doctor" });
});

router.get("/paciente", role("paciente"), (req, res) => {
  res.json({ message: "Bienvenido Paciente" });
});

module.exports = router;
