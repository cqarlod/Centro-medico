const express = require("express");
const router = express.Router();
const db = require("../config/db");

const { isAuthenticated, hasRole } = require("../middlewares/auth.middleware");

router.use(isAuthenticated);
router.use(hasRole("recepcionista"));

// Obtener doctores
router.get("/doctores", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.id,
        u.nombre,
        d.especialidad
      FROM doctores d
      JOIN usuarios u ON d.usuario_id = u.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error en /doctores:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear cita
router.post("/citas", async (req, res) => {
  try {
    const { paciente_id, doctor_id, fecha, hora, nota } = req.body;

    if (!paciente_id || !doctor_id || !fecha || !hora) {
      return res.status(400).json({ 
        message: "Faltan datos requeridos (paciente, doctor, fecha, hora)" 
      });
    }

    const existe = await db.query(
      "SELECT * FROM citas WHERE doctor_id = $1 AND fecha = $2 AND hora = $3",
      [doctor_id, fecha, hora]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        message: "El doctor ya tiene una cita en ese horario"
      });
    }

    const result = await db.query(
      "INSERT INTO citas (paciente_id, doctor_id, fecha, hora, nota) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [paciente_id, doctor_id, fecha, hora, nota || null]
    );

    const citaNuevaResult = await db.query(
      `SELECT c.id, c.hora, c.estado, 
          p.nombre AS paciente, 
          u.nombre AS doctor
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN doctores d ON c.doctor_id = d.id
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE c.id = $1`,
      [result.rows[0].id]
    );

    const citaNueva = citaNuevaResult.rows[0];

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
    const result = await db.query(`
      SELECT 
        c.*, 
        p.nombre AS paciente, 
        u.nombre AS doctor
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN doctores d ON c.doctor_id = d.id
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE c.fecha = CURRENT_DATE
      ORDER BY c.hora ASC
    `);

    res.json(result.rows);
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
      "UPDATE citas SET estado = $1 WHERE id = $2",
      [estado, id]
    );

    res.json({ message: "Estado actualizado correctamente" });

  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener pacientes
router.get("/pacientes", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM pacientes ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error en /pacientes:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear paciente
router.post("/pacientes", async (req, res) => {
  try {
    const { nombre, telefono, correo, fecha_nacimiento } = req.body;

    const result = await db.query(
      "INSERT INTO pacientes (nombre, telefono, correo, fecha_nacimiento) VALUES ($1, $2, $3, $4) RETURNING id",
      [nombre, telefono || null, correo || null, fecha_nacimiento]
    );

    res.json({
      message: "Paciente creado correctamente",
      id: result.rows[0].id
    });

  } catch (error) {
    console.error("Error al crear paciente:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los doctores para el filtro del calendario
router.get("/doctores-lista", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.id,
        u.nombre,
        d.especialidad
      FROM doctores d
      JOIN usuarios u ON d.usuario_id = u.id
      ORDER BY u.nombre ASC
    `);
    res.json(result.rows);
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
    let paramIndex = 1;
    
    if (doctor_id && doctor_id !== 'todos') {
      query += ` AND d.id = $${paramIndex}`;
      params.push(doctor_id);
      paramIndex++;
    }
    
    if (fecha_inicio) {
      query += ` AND c.fecha >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }
    
    if (fecha_fin) {
      query += ` AND c.fecha <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }
    
    query += " ORDER BY c.fecha ASC, c.hora ASC";
    
    const result = await db.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error("Error en /citas-calendario:", error);
    res.status(500).json({ error: error.message });
  }
});

// Guardar notificación en DB y emitir por socket
router.post("/citas/:id/notificar", async (req, res) => {
  try {
    const citaId = req.params.id;
    const { doctor_id, paciente_nombre } = req.body;
    const recepcionista_id = req.session.usuario.id;

    // 1. Guardar en Base de Datos (Supabase)
    const result = await db.query(
      `INSERT INTO notificaciones_atencion 
      (cita_id, recepcionista_id, doctor_id, estado, mensaje_recepcion) 
      VALUES ($1, $2, $3, 'pendiente', $4) RETURNING *`,
      [citaId, recepcionista_id, doctor_id, 'El paciente ha llegado y está en sala de espera']
    );

    // 2. Emitir evento por WebSockets
    const io = req.app.get('socketio');
    if (io) {
      io.emit(`doctor-${doctor_id}`, {
        paciente: paciente_nombre,
        doctorId: doctor_id,
        recepcionistaId: recepcionista_id,
        notificacionId: result.rows[0].id
      });
    }

    res.json({ message: "Notificación guardada y enviada", data: result.rows[0] });

  } catch (error) {
    console.error("Error al registrar notificación:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;