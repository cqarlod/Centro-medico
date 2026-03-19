const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { isAuthenticated } = require("../middlewares/auth.middleware");

router.use(isAuthenticated);

// Obtener historial de mensajes generales (últimos 50)
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        mg.id,
        mg.usuarios_id as emisor_id,
        mg.emisor_rol,
        mg.mensaje,
        mg.fecha_envio,
        mg.emisor_nombre
      FROM mensajes_generales mg
      ORDER BY mg.fecha_envio ASC
      LIMIT 50
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo mensajes generales:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Enviar un nuevo mensaje general
router.post("/", async (req, res) => {
  try {
    const { mensaje } = req.body;
    const usuario = req.session.usuario;
    
    if (!mensaje || mensaje.trim() === '') {
      return res.status(400).json({ message: "El mensaje no puede estar vacío" });
    }

    const emisor_id = usuario.id;
    const emisor_rol = usuario.rol;
    const emisor_nombre = usuario.nombre; // Extra value to send immediately

    const result = await db.query(`
      INSERT INTO mensajes_generales (usuarios_id, emisor_rol, emisor_nombre, mensaje)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [emisor_id, emisor_rol, emisor_nombre, mensaje]);

    const nuevoMensaje = result.rows[0];
    nuevoMensaje.emisor_nombre = emisor_nombre;

    // Emitir broadcast a todos
    const io = req.app.get('socketio');
    if (io) {
      io.emit('mensaje-general', nuevoMensaje);
    }

    res.status(201).json(nuevoMensaje);
  } catch (error) {
    console.error("Error enviando mensaje general:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
