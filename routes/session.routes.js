const express = require("express");
const router = express.Router();

router.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Error al cerrar sesión");
    }
    res.redirect("/login.html");
  });
});

router.get("/me", (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ message: "No autenticado" });
  }

  res.json(req.session.usuario);
});

module.exports = router;
