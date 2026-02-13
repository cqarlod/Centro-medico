const db = require("../config/db");

const Usuario = {
  findByEmail: (correo, callback) => {
    const sql = "SELECT * FROM usuarios WHERE correo = ?";
    db.query(sql, [correo], callback);
  },

  create: (data, callback) => {
    const sql = `
      INSERT INTO usuarios (nombre, correo, password, rol)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [
      data.nombre,
      data.correo,
      data.password,
      data.rol
    ], callback);
  }
};

module.exports = Usuario;
