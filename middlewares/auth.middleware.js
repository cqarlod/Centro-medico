exports.isAuthenticated = (req, res, next) => {
  if (!req.session.usuario) {
    return res.redirect("/login.html");
  }
  next();
};

exports.hasRole = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.session.usuario) {
      return res.redirect("/login.html");
    }

    if (!rolesPermitidos.includes(req.session.usuario.rol)) {
      return res.status(403).send("Acceso denegado");
    }

    next();
  };
};
