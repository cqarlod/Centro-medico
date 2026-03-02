const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'TU_ANON_KEY';

if (supabaseUrl === 'https://tu-proyecto.supabase.co') {
  console.warn("⚠️  ADVERTENCIA: No se encontró SUPABASE_URL en el archivo .env. Por favor añádelo.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
