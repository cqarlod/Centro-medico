// reset-password.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetPassword() {
  try {
    console.log("🔍 Conectando a Supabase...");
    
    // Usar el correo que SÍ existe
    const correo = "recepcion@centro1.com";
    const nuevaPassword = "recepcion123"; // Puedes cambiarla
    
    // Verificar usuario
    const userCheck = await pool.query(
      "SELECT id, nombre, rol, password FROM usuarios WHERE correo = $1",
      [correo]
    );
    
    if (userCheck.rows.length === 0) {
      console.log("❌ Usuario no encontrado");
      return;
    }
    
    console.log("✅ Usuario encontrado:");
    console.log("   Nombre:", userCheck.rows[0].nombre);
    console.log("   Rol:", userCheck.rows[0].rol);
    
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
    
    await pool.query(
      "UPDATE usuarios SET password = $1 WHERE correo = $2",
      [hashedPassword, correo]
    );
    
    console.log("✅ Contraseña actualizada correctamente");
    console.log("   Usuario:", correo);
    console.log("   Nueva contraseña:", nuevaPassword);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit();
  }
}

resetPassword();