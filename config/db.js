const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para Supabase [citation:3]
  }
});

// Verificar conexión
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error conectando a Supabase:', err.stack);
  }
  console.log('Conectado a Supabase');
  release();
});

module.exports = pool;