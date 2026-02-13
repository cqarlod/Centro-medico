exports.autorizarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.session.usuario) {
      return res.status(401).json({ message: "No autenticado" });
    }

    if (!rolesPermitidos.includes(req.session.usuario.rol)) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    next();
  };
};
