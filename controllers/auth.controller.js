const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // PostgreSQL: query devuelve { rows } NO [rows]
    const result = await db.query(
      "SELECT * FROM usuarios WHERE correo = $1",
      [correo]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const usuario = result.rows[0];

    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const rol = usuario.rol.toLowerCase();

    if (!["admin", "doctor", "recepcionista"].includes(rol)) {
      return res.status(403).json({ message: "Rol no permitido" });
    }

    // Guardar sesion
    req.session.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol,
      foto: usuario.foto
    };

    res.json({
      message: "Login exitoso",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol
      }
    });

  } catch (error) {
    console.error("ERROR LOGIN:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const { actual, nueva } = req.body;

    const usuarioId = req.session.usuario.id;

    // PostgreSQL: query con $1
    const result = await db.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [usuarioId]
    );

    const usuario = result.rows[0];

    const passwordValido = await bcrypt.compare(actual, usuario.password);

    if (!passwordValido) {
      return res.status(400).json({ message: "Contraseña actual incorrecta" });
    }

    const nuevaHash = await bcrypt.hash(nueva, 10);

    await db.query(
      "UPDATE usuarios SET password = $1 WHERE id = $2",
      [nuevaHash, usuarioId]
    );

    res.json({ message: "Contraseña actualizada" });

  } catch (error) {
    console.error("ERROR cambiarPassword:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};