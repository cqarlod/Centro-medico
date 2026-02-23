const express = require("express");
const router = express.Router();
const db = require("../config/db");

const { isAuthenticated, hasRole } = require("../middlewares/auth.middleware");

router.use(isAuthenticated);
router.use(hasRole("recepcionista"));

// Obtener doctores
router.get("/doctores", async (req, res) => {
  const [rows] = await db.query(`
    SELECT 
      d.id,
      u.nombre,
      d.especialidad
    FROM doctores d
    JOIN usuarios u ON d.usuario_id = u.id
  `);

  res.json(rows);
});

// Crear cita
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
          u.nombre AS doctor
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN doctores d ON c.doctor_id = d.id
      JOIN usuarios u ON d.usuario_id = u.id
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
      SELECT 
        c.*, 
        p.nombre AS paciente, 
        u.nombre AS doctor
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN doctores d ON c.doctor_id = d.id
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE c.fecha = CURDATE()
      ORDER BY c.hora ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error en /citas-hoy:", error);
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

// Obtener todos los doctores para el filtro del calendario
router.get("/doctores-lista", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        u.nombre,
        d.especialidad
      FROM doctores d
      JOIN usuarios u ON d.usuario_id = u.id
      ORDER BY u.nombre ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error en /doctores-lista:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener citas para el calendario con filtros
router.get("/citas-calendario", async (req, res) => {
  try {
    const { doctor_id, fecha_inicio, fecha_fin } = req.query;
    
    let query = `
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.nota,
        p.nombre AS paciente,
        p.telefono AS paciente_telefono,
        u.nombre AS doctor,
        d.id AS doctor_id
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN doctores d ON c.doctor_id = d.id
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (doctor_id && doctor_id !== 'todos') {
      query += " AND d.id = ?";
      params.push(doctor_id);
    }
    
    if (fecha_inicio) {
      query += " AND c.fecha >= ?";
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      query += " AND c.fecha <= ?";
      params.push(fecha_fin);
    }
    
    query += " ORDER BY c.fecha ASC, c.hora ASC";
    
    const [rows] = await db.query(query, params);
    res.json(rows);
    
  } catch (error) {
    console.error("❌ Error en /citas-calendario:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
