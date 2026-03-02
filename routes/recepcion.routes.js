const express = require("express");
const router = express.Router();
const db = require("../config/db");

const { isAuthenticated, hasRole } = require("../middlewares/auth.middleware");

router.use(isAuthenticated);
router.use(hasRole("recepcionista"));

// Obtener doctores
router.get("/doctores", async (req, res) => {
  try {
    const { data: rows, error: doctoresError } = await db.from('doctores').select('*, usuarios(nombre)');
    if (doctoresError) throw doctoresError;

    // Mapear doctores para devolver en el mismo formato antiguo
    const doctoresMapped = rows.map(d => ({
      id: d.id,
      nombre: d.usuarios ? d.usuarios.nombre : 'Doctor Sin Nombre',
      especialidad: d.especialidad
    }));

    res.json(doctoresMapped);
  } catch (error) {
    console.error("Error doctores:", error);
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
    const { data: existe, error: errorCheck } = await db
      .from('citas')
      .select('*')
      .eq('doctor_id', doctor_id)
      .eq('fecha', fecha)
      .eq('hora', hora);

    if (errorCheck) throw errorCheck;

    if (existe.length > 0) {
      return res.status(400).json({
        message: "El doctor ya tiene una cita en ese horario"
      });
    }

    // Insertar la cita
    const { data: insertResult, error: insertError } = await db
      .from('citas')
      .insert([{ paciente_id, doctor_id, fecha, hora, nota: nota || null }])
      .select();

    if (insertError) throw insertError;

    // Obtener la cita creada con nombres
    const { data: citas, error: errorCita } = await db
      .from('citas')
      .select(`
        id, hora, estado,
        pacientes ( nombre ),
        doctores ( usuarios(nombre) )
      `)
      .eq('id', insertResult[0].id);

    if (errorCita) throw errorCita;

    const rawCita = citas[0];
    const citaNueva = {
      id: rawCita.id,
      hora: rawCita.hora,
      estado: rawCita.estado,
      paciente: rawCita.pacientes ? rawCita.pacientes.nombre : 'Desconocido',
      doctor: rawCita.doctores && rawCita.doctores.usuarios ? rawCita.doctores.usuarios.nombre : 'Doctor'
    };

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
    const hoy = new Date().toISOString().split('T')[0];
    const { data: rows, error: hoyError } = await db
      .from('citas')
      .select(`
        *,
        pacientes ( nombre ),
        doctores ( usuarios(nombre) )
      `)
      .eq('fecha', hoy)
      .order('hora', { ascending: true });

    if (hoyError) throw hoyError;

    const citasFinal = rows.map(r => ({
      ...r,
      paciente: r.pacientes ? r.pacientes.nombre : 'Desconocido',
      doctor: r.doctores && r.doctores.usuarios ? r.doctores.usuarios.nombre : 'Doctor'
    }));
    res.json(citasFinal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado de cita
router.put("/citas/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const { error: errorUpdate } = await db
      .from('citas')
      .update({ estado })
      .eq('id', id);

    if (errorUpdate) throw errorUpdate;

    res.json({ message: "Estado actualizado correctamente" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Obtener pacientes
router.get("/pacientes", async (req, res) => {
  try {
    const { data: rows, error: pError } = await db.from('pacientes').select('*');
    if (pError) throw pError;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear paciente
router.post("/pacientes", async (req, res) => {
  try {
    const { nombre, telefono, correo, fecha_nacimiento } = req.body;

    const { data: result, error: insertErr } = await db
      .from('pacientes')
      .insert([{ nombre, telefono, correo, fecha_nacimiento }])
      .select();

    if (insertErr) throw insertErr;

    res.json({
      message: "Paciente creado correctamente",
      id: result[0].id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
