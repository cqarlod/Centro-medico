const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");


const authController = require("../controllers/auth.controller");
const db = require("../config/db");

console.log("AUTH CONTROLLER:", authController);

// POST /auth/login
router.post("/login", authController.login);

const { isAuthenticated } = require("../middlewares/auth.middleware");

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Sesión cerrada" });
  });
});

router.post("/cambiar-password", authController.cambiarPassword);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/perfiles");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.session.usuario.id + ext);
  }
});

const upload = multer({ storage });

router.post(
  "/subir-foto",
  isAuthenticated,
  upload.single("foto"),
  async (req, res) => {
    const fotoPath = "/uploads/perfiles/" + req.file.filename;

    const { error: errorDB } = await db
      .from('usuarios')
      .update({ foto: fotoPath })
      .eq('id', req.session.usuario.id);

    if (errorDB) throw errorDB;

    req.session.usuario.foto = fotoPath;

    res.json({ message: "Foto actualizada", foto: fotoPath });
  }
);

module.exports = router;
