const express = require("express");
const router = express.Router();
const db = require("../config/db");

const { isAuthenticated, hasRole } = require("../middlewares/auth.middleware");

router.use(isAuthenticated);
router.use(hasRole("doctor"));

// Obtener datos del doctor logueado (SIN foto)
router.get("/perfil", async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    
    const result = await db.query(`
      SELECT 
        d.id as doctor_id,
        u.nombre,
        u.correo,
        d.especialidad
      FROM doctores d
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE u.id = $1
    `, [usuarioId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error("Error en /perfil:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener citas del doctor (con filtros)
router.get("/citas", async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const { fecha, estado } = req.query;
    
    // Obtener el doctor_id del usuario logueado
    const doctorResult = await db.query(
      "SELECT id FROM doctores WHERE usuario_id = $1",
      [usuarioId]
    );
    
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }
    
    const doctorId = doctorResult.rows[0].id;
    
    let query = `
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.nota,
        p.id as paciente_id,
        p.nombre AS paciente,
        p.telefono AS paciente_telefono,
        p.correo AS paciente_correo
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.doctor_id = $1
    `;
    
    const params = [doctorId];
    let paramIndex = 2;
    
    if (fecha) {
      query += ` AND c.fecha = $${paramIndex}`;
      params.push(fecha);
      paramIndex++;
    }
    
    if (estado && estado !== 'todos') {
      query += ` AND c.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }
    
    query += " ORDER BY c.fecha ASC, c.hora ASC";
    
    const result = await db.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error("Error en /citas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener citas para el calendario
router.get("/citas-calendario", async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const { fecha_inicio, fecha_fin } = req.query;
    
    const doctorResult = await db.query(
      "SELECT id FROM doctores WHERE usuario_id = $1",
      [usuarioId]
    );
    
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }
    
    const doctorId = doctorResult.rows[0].id;
    
    const result = await db.query(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.nota,
        p.nombre AS paciente,
        p.telefono AS paciente_telefono
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.doctor_id = $1
        AND c.fecha BETWEEN $2 AND $3
      ORDER BY c.fecha ASC, c.hora ASC
    `, [doctorId, fecha_inicio, fecha_fin]);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error("Error en /citas-calendario:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado de cita
router.put("/citas/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const estadosValidos = ['Programada', 'Atendida', 'Cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ message: "Estado no válido" });
    }
    
    await db.query(
      "UPDATE citas SET estado = $1 WHERE id = $2",
      [estado, id]
    );
    
    res.json({ message: "Estado actualizado correctamente" });
    
  } catch (error) {
    console.error("Error actualizando estado:", error);
    res.status(500).json({ error: error.message });
  }
});

// Agregar/actualizar nota de cita
router.put("/citas/:id/nota", async (req, res) => {
  try {
    const { id } = req.params;
    const { nota } = req.body;
    
    await db.query(
      "UPDATE citas SET nota = $1 WHERE id = $2",
      [nota, id]
    );
    
    res.json({ message: "Nota actualizada correctamente" });
    
  } catch (error) {
    console.error("Error actualizando nota:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reprogramar cita
router.put("/citas/:id/reprogramar", async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora } = req.body;
    
    if (!fecha || !hora) {
      return res.status(400).json({ message: "Fecha y hora requeridas" });
    }
    
    // Verificar disponibilidad
    const cita = await db.query(
      `SELECT doctor_id FROM citas WHERE id = $1`,
      [id]
    );
    
    if (cita.rows.length === 0) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    
    const doctorId = cita.rows[0].doctor_id;
    
    const existe = await db.query(
      `SELECT id FROM citas 
       WHERE doctor_id = $1 AND fecha = $2 AND hora = $3 AND id != $4`,
      [doctorId, fecha, hora, id]
    );
    
    if (existe.rows.length > 0) {
      return res.status(400).json({ 
        message: "Ya existe una cita en ese horario" 
      });
    }
    
    await db.query(
      "UPDATE citas SET fecha = $1, hora = $2 WHERE id = $3",
      [fecha, hora, id]
    );
    
    res.json({ message: "Cita reprogramada correctamente" });
    
  } catch (error) {
    console.error("Error reprogramando cita:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadisticas del doctor
router.get("/estadisticas", async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    
    const doctorResult = await db.query(
      "SELECT id FROM doctores WHERE usuario_id = $1",
      [usuarioId]
    );
    
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }
    
    const doctorId = doctorResult.rows[0].id;
    
    const hoy = new Date().toISOString().split('T')[0];
    
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_hoy,
        COALESCE(SUM(CASE WHEN estado = 'Programada' THEN 1 ELSE 0 END), 0) as pendientes_hoy,
        COALESCE(SUM(CASE WHEN estado = 'Atendida' THEN 1 ELSE 0 END), 0) as atendidas_hoy,
        COALESCE(SUM(CASE WHEN estado = 'Cancelada' THEN 1 ELSE 0 END), 0) as canceladas_hoy,
        COALESCE(COUNT(CASE WHEN fecha >= CURRENT_DATE THEN 1 END), 0) as proximas
      FROM citas
      WHERE doctor_id = $1 AND fecha = $2
    `, [doctorId, hoy]);
    
    res.json(stats.rows[0]);
    
  } catch (error) {
    console.error("Error en /estadisticas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de un paciente específico
router.get("/pacientes/:pacienteId/historial", async (req, res) => {
  try {
    const usuarioId = req.session.usuario.id;
    const { pacienteId } = req.params;
    
    // Verificar que el doctor existe
    const doctorResult = await db.query(
      "SELECT id FROM doctores WHERE usuario_id = $1",
      [usuarioId]
    );
    
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: "Doctor no encontrado" });
    }
    
    const doctorId = doctorResult.rows[0].id;
    
    // Obtener todas las citas del paciente con este doctor
    const citasResult = await db.query(`
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.nota,
        p.nombre as paciente,
        p.telefono,
        p.correo,
        p.fecha_nacimiento
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.paciente_id = $1 AND c.doctor_id = $2
      ORDER BY c.fecha DESC, c.hora DESC
    `, [pacienteId, doctorId]);
    
    // Obtener datos del paciente
    const pacienteResult = await db.query(`
      SELECT 
        id,
        nombre,
        telefono,
        correo,
        fecha_nacimiento
      FROM pacientes
      WHERE id = $1
    `, [pacienteId]);
    
    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }
    
    res.json({
      paciente: pacienteResult.rows[0],
      citas: citasResult.rows
    });
    
  } catch (error) {
    console.error("Error en /historial:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;