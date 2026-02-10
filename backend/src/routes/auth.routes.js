import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPool, sql } from "../config/db.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ ok: false, message: "Faltan datos" });
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("correo", sql.VarChar(100), correo)
      .query(`
        SELECT 
          u.id_usuario, u.nombre, u.correo, u.password_hash, u.activo,
          r.id_rol, r.nombre_rol
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.correo = @correo
      `);

    const user = result.recordset?.[0];

    if (!user) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });
    if (!user.activo) return res.status(403).json({ ok: false, message: "Usuario inactivo" });

    const okPass = await bcrypt.compare(password, user.password_hash);
    if (!okPass) return res.status(401).json({ ok: false, message: "Credenciales inválidas" });

    // Roles válidos en tu sistema: "jefe" | "empleado"
    const payload = {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      id_rol: user.id_rol,
      rol: user.nombre_rol, // jefe | empleado
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

    return res.json({ ok: true, token, usuario: payload });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error en login" });
  }
});

// POST /api/auth/recover (demo)
router.post("/recover", async (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ ok: false, message: "Falta correo" });

  // Aquí después puedes enviar correo real.
  return res.json({ ok: true, message: `Recuperación enviada a ${correo}` });
});

export default router;
