const db = require("../config/db");

const Usuario = {
  findByEmail: async (correo) => {
    const { data: rows, error } = await db
      .from('usuarios')
      .select('*')
      .eq('correo', correo);
    if (error) throw error;
    return rows;
  },

  create: async (data) => {
    const { data: result, error } = await db
      .from('usuarios')
      .insert([{
        nombre: data.nombre,
        correo: data.correo,
        password: data.password,
        rol: data.rol
      }])
      .select();
    if (error) throw error;
    return result;
  }
};

module.exports = Usuario;
