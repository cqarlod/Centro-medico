const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

const { isAuthenticated, hasRole } = require("../middlewares/auth.middleware");

router.use(isAuthenticated);
router.use(hasRole("admin"));

// =============================================
// GESTIÓN DE USUARIOS
// =============================================

// Obtener todos los usuarios
router.get("/usuarios", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.rol,
        CASE 
          WHEN u.rol = 'doctor' THEN d.especialidad
          ELSE NULL
        END as especialidad
      FROM usuarios u
      LEFT JOIN doctores d ON u.id = d.usuario_id
      ORDER BY u.nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error en /usuarios:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo usuario
router.post("/usuarios", async (req, res) => {
  try {
    const { nombre, correo, password, rol, especialidad } = req.body;
    
    // LOG PARA DEPURAR
    console.log("Datos recibidos en backend:", {
      nombre,
      correo,
      password: password ? "********" : "(vacío)",
      rol,
      especialidad
    });
    
    // Validar datos requeridos
    if (!nombre || !correo || !password || !rol) {
      console.log("Campos faltantes:", { nombre, correo, password, rol });
      return res.status(400).json({ 
        message: "Faltan datos requeridos (nombre, correo, password, rol)" 
      });
    }
    
    // Validar que el rol sea válido
    const rolesValidos = ['admin', 'doctor', 'recepcionista'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ message: "Rol no válido" });
    }
    
    // Validar que el doctor tenga especialidad
    if (rol === 'doctor' && !especialidad) {
      return res.status(400).json({ 
        message: "Los doctores deben tener una especialidad" 
      });
    }
    
    // Verificar si el correo ya existe
    const existe = await db.query(
      "SELECT id FROM usuarios WHERE correo = $1",
      [correo]
    );
    
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }
    
    // Encriptar password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Iniciar transacción
    await db.query('BEGIN');
    
    // Insertar usuario
    const userResult = await db.query(
      `INSERT INTO usuarios (nombre, correo, password, rol) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [nombre, correo, hashedPassword, rol]
    );
    
    const usuarioId = userResult.rows[0].id;
    
    // Si es doctor, insertar en tabla doctores
    if (rol === 'doctor') {
      await db.query(
        `INSERT INTO doctores (usuario_id, especialidad) VALUES ($1, $2)`,
        [usuarioId, especialidad]
      );
    }
    
    await db.query('COMMIT');
    
    res.status(201).json({ 
      message: "Usuario creado correctamente",
      id: usuarioId 
    });
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Error creando usuario:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario
router.put("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, especialidad } = req.body;
    
    // Verificar si el usuario existe
    const existe = await db.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [id]
    );
    
    if (existe.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    const usuarioActual = existe.rows[0];
    
    // Iniciar transacción
    await db.query('BEGIN');
    
    // Actualizar usuario
    await db.query(
      `UPDATE usuarios SET nombre = $1, correo = $2, rol = $3 WHERE id = $4`,
      [nombre, correo, rol, id]
    );
    
    // Si cambió a doctor y no tenía especialidad
    if (rol === 'doctor') {
      const doctorExiste = await db.query(
        "SELECT id FROM doctores WHERE usuario_id = $1",
        [id]
      );
      
      if (doctorExiste.rows.length === 0) {
        await db.query(
          `INSERT INTO doctores (usuario_id, especialidad) VALUES ($1, $2)`,
          [id, especialidad]
        );
      } else {
        await db.query(
          `UPDATE doctores SET especialidad = $1 WHERE usuario_id = $2`,
          [especialidad, id]
        );
      }
    } 
    // Si ya no es doctor, eliminar de doctores
    else if (usuarioActual.rol === 'doctor' && rol !== 'doctor') {
      await db.query(
        "DELETE FROM doctores WHERE usuario_id = $1",
        [id]
      );
    }
    
    await db.query('COMMIT');
    
    res.json({ message: "Usuario actualizado correctamente" });
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario
router.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el usuario existe
    const existe = await db.query(
      "SELECT id FROM usuarios WHERE id = $1",
      [id]
    );
    
    if (existe.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    await db.query("DELETE FROM usuarios WHERE id = $1", [id]);
    
    res.json({ message: "Usuario eliminado correctamente" });
    
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resetear contraseña de usuario
router.post("/usuarios/:id/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaPassword } = req.body;
    
    if (!nuevaPassword) {
      return res.status(400).json({ message: "La nueva contraseña es requerida" });
    }
    
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
    
    await db.query(
      "UPDATE usuarios SET password = $1 WHERE id = $2",
      [hashedPassword, id]
    );
    
    res.json({ message: "Contraseña actualizada correctamente" });
    
  } catch (error) {
    console.error("Error reseteando password:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ESTADÍSTICAS
// =============================================
router.get("/estadisticas", async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') as total_admins,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'doctor') as total_doctores,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'recepcionista') as total_recepcionistas,
        (SELECT COUNT(*) FROM pacientes) as total_pacientes,
        (SELECT COUNT(*) FROM citas) as total_citas,
        (SELECT COUNT(*) FROM citas WHERE fecha = CURRENT_DATE) as citas_hoy
    `);
    
    res.json(stats.rows[0]);
    
  } catch (error) {
    console.error("Error en /estadisticas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las citas (para vista general)
router.get("/citas", async (req, res) => {
  try {
    const { fecha, estado } = req.query;
    
    let query = `
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.nota,
        p.nombre AS paciente,
        u.nombre AS doctor,
        p.telefono AS paciente_telefono
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN doctores d ON c.doctor_id = d.id
      JOIN usuarios u ON d.usuario_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
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
    
    query += " ORDER BY c.fecha DESC, c.hora DESC";
    
    const result = await db.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error("Error en /citas:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;