const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearAdmin() {
  try {
    console.log("🔧 Creando usuario administrador...");
    
    const nombre = "Administrador";
    const correo = "admin@centromedico.com";
    const password = "admin123";
    const rol = "admin";
    
    // Verificar si ya existe
    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE correo = $1",
      [correo]
    );
    
    if (existe.rows.length > 0) {
      console.log("❌ Ya existe un usuario con ese correo");
      console.log("Prueba con otro correo o elimina el existente");
      return;
    }
    
    // Encriptar password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insertar admin
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, correo, password, rol) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [nombre, correo, hashedPassword, rol]
    );
    
    console.log("✅ Administrador creado exitosamente!");
    console.log("=================================");
    console.log("📧 Correo:", correo);
    console.log("🔑 Contraseña:", password);
    console.log("🆔 ID:", result.rows[0].id);
    console.log("=================================");
    console.log("Accede a: http://localhost:3000/admin/dashboard");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit();
  }
}

crearAdmin();