import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ ok: false, message: "No token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id_usuario, correo, rol, id_rol, nombre }
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token inválido" });
  }
}

export function allowRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({ ok: false, message: "No autorizado" });
    }
    next();
  };
}
