require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
    console.log('Validando conexión...');

    // Verificar doctores
    const { data: doctores, error: errDoctores } = await db.from('doctores').select('*, usuarios(nombre)');
    if (errDoctores) console.error("Error doctores:", errDoctores.message);
    else console.log("Doctores OK:", doctores[0]);

    // Testing Complete
    process.exit(0);

    process.exit(0);
})();
