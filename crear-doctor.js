// crear-doctor.js - VERSIÓN CORREGIDA
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearDoctor() {
  try {
    console.log("🔍 Conectando a Supabase...");
    
    // Datos del doctor
    const nombreDoctor = "Dr. Carlos Mendoza";
    const correoDoctor = "carlos.mendoza@centromedico.com";
    const passwordDoctor = "doctor123";
    const especialidad = "Cardiología";
    
    // Verificar si el correo ya existe
    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE correo = $1",
      [correoDoctor]
    );
    
    if (existe.rows.length > 0) {
      console.log("⚠️ El correo ya existe. Usando otro correo...");
      return;
    }
    
    // 1. Crear el usuario (PostgreSQL asignará el ID automáticamente)
    console.log("📝 Creando usuario...");
    const hashedPassword = await bcrypt.hash(passwordDoctor, 10);
    
    const userResult = await pool.query(
      `INSERT INTO usuarios (nombre, correo, password, rol) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [nombreDoctor, correoDoctor, hashedPassword, 'doctor']
    );
    
    const usuarioId = userResult.rows[0].id;
    console.log("✅ Usuario creado con ID:", usuarioId);
    
    // 2. Crear el doctor
    console.log("📝 Creando doctor...");
    const doctorResult = await pool.query(
      `INSERT INTO doctores (usuario_id, especialidad) 
       VALUES ($1, $2) 
       RETURNING id`,
      [usuarioId, especialidad]
    );
    
    console.log("\n🎉 DOCTOR CREADO EXITOSAMENTE");
    console.log("=================================");
    console.log("👨‍⚕️ Nombre:", nombreDoctor);
    console.log("📧 Correo:", correoDoctor);
    console.log("🔑 Contraseña:", passwordDoctor);
    console.log("🏥 Especialidad:", especialidad);
    console.log("🆔 ID Doctor:", doctorResult.rows[0].id);
    console.log("🆔 ID Usuario:", usuarioId);
    console.log("=================================");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit();
  }
}

crearDoctor();