const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const { data: rows, error: queryError } = await db
      .from('usuarios')
      .select('*')
      .eq('correo', correo);

    if (queryError) throw queryError;

    if (rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const usuario = rows[0];

    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const rol = usuario.rol.toLowerCase();

    if (!["admin", "doctor", "recepcionista"].includes(rol)) {
      return res.status(403).json({ message: "Rol no permitido" });
    }


    //Guardar sesion
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

    const { data: rows, error: queryError } = await db
      .from('usuarios')
      .select('*')
      .eq('id', usuarioId);

    if (queryError) throw queryError;

    const usuario = rows[0];

    const passwordValido = await bcrypt.compare(actual, usuario.password);

    if (!passwordValido) {
      return res.status(400).json({ message: "Contraseña actual incorrecta" });
    }

    const nuevaHash = await bcrypt.hash(nueva, 10);

    const { error: updateError } = await db
      .from('usuarios')
      .update({ password: nuevaHash })
      .eq('id', usuarioId);

    if (updateError) throw updateError;

    res.json({ message: "Contraseña actualizada" });

  } catch (error) {
    res.status(500).json({ message: "Error del servidor" });
  }
};

