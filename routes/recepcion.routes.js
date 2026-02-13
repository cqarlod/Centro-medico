const express = require("express");
const router = express.Router();
const db = require("../config/db");

const { isAuthenticated, hasRole } = require("../middlewares/auth.middleware");

router.use(isAuthenticated);
router.use(hasRole("recepcionista"));

// Obtener doctores
router.get("/doctores", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM doctores");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear cita
// Crear cita - CORREGIDO
router.post("/citas", async (req, res) => {
  try {
    const { paciente_id, doctor_id, fecha, hora, nota } = req.body;

    // Validar datos requeridos
    if (!paciente_id || !doctor_id || !fecha || !hora) {
      return res.status(400).json({ 
        message: "Faltan datos requeridos (paciente, doctor, fecha, hora)" 
      });
    }

    // Verificar si ya existe cita en ese horario con ese doctor
    const [existe] = await db.query(
      "SELECT * FROM citas WHERE doctor_id = ? AND fecha = ? AND hora = ?",
      [doctor_id, fecha, hora]
    );

    if (existe.length > 0) {
      return res.status(400).json({
        message: "El doctor ya tiene una cita en ese horario"
      });
    }

    // Insertar la cita
    const [result] = await db.query(
      "INSERT INTO citas (paciente_id, doctor_id, fecha, hora, nota) VALUES (?, ?, ?, ?, ?)",
      [paciente_id, doctor_id, fecha, hora, nota || null]
    );

    // Obtener la cita creada con nombres
    const [[citaNueva]] = await db.query(
      `SELECT c.id, c.hora, c.estado, 
              p.nombre AS paciente, 
              d.nombre AS doctor
       FROM citas c
       JOIN pacientes p ON c.paciente_id = p.id
       JOIN doctores d ON c.doctor_id = d.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: "Cita creada correctamente",
      cita: citaNueva
    });

  } catch (error) {
    console.error("Error al crear cita:", error);
    res.status(500).json({ 
      message: "Error al crear la cita", 
      error: error.message 
    });
  }
});


// Ver citas del día
router.get("/citas-hoy", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, p.nombre AS paciente, d.nombre AS doctor
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN doctores d ON c.doctor_id = d.id
      WHERE c.fecha = CURDATE()
      ORDER BY c.hora ASC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado de cita
router.put("/citas/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    await db.query(
      "UPDATE citas SET estado = ? WHERE id = ?",
      [estado, id]
    );

    res.json({ message: "Estado actualizado correctamente" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Obtener pacientes
router.get("/pacientes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM pacientes");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear paciente
router.post("/pacientes", async (req, res) => {
  try {
    const { nombre, telefono, correo, fecha_nacimiento } = req.body;

    const [result] = await db.query(
      "INSERT INTO pacientes (nombre, telefono, correo, fecha_nacimiento) VALUES (?, ?, ?, ?)",
      [nombre, telefono, correo, fecha_nacimiento]
    );

    res.json({
      message: "Paciente creado correctamente",
      id: result.insertId
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
