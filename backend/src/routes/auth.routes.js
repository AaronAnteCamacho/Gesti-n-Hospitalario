import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPool, sql } from "../config/db.js";
import { sendResetEmail } from "../services/mailer.js";

const router = Router();

function isValidEmail(v) {
  return /.+@.+\..+/.test(String(v || "").trim());
}

// Anti-spam simple por IP (1 intento cada 30s)
const lastRecoverByIp = new Map();
function canRecover(ip) {
  const now = Date.now();
  const last = lastRecoverByIp.get(ip) || 0;
  if (now - last < 30_000) return false;
  lastRecoverByIp.set(ip, now);
  return true;
}

/**
 * POST /api/auth/login
 * body: { correo, password }
 */
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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, message: "Falta JWT_SECRET en el servidor" });
    }

    const payload = {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      id_rol: user.id_rol,
      rol: user.nombre_rol, // "jefe" | "empleado"
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

    return res.json({ ok: true, token, usuario: payload });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error en login" });
  }
});

/**
 * POST /api/auth/recover
 * body: { correo }
 *
 * Envía un email (Gmail) con link: FRONTEND_URL/reset-password?token=...
 * Respuesta genérica siempre (no revela si el correo existe).
 */
router.post("/recover", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "unknown";
    if (!canRecover(ip)) {
      return res.status(429).json({ ok: false, message: "Espera un momento e inténtalo de nuevo." });
    }

    const correo = String(req.body?.correo || "").trim();
    if (!correo) return res.status(400).json({ ok: false, message: "Falta correo" });
    if (!isValidEmail(correo)) return res.status(400).json({ ok: false, message: "Correo inválido" });

    const genericMsg =
      "Si el correo está registrado, se enviarán instrucciones para recuperar el acceso.";

    const pool = await getPool();
    const r = await pool
      .request()
      .input("correo", sql.VarChar(100), correo)
      .query(`SELECT TOP 1 id_usuario, correo, activo FROM usuarios WHERE correo=@correo`);

    const user = r.recordset?.[0];

    // Siempre responder genérico (evita enumeración)
    if (!user || !user.activo) {
      return res.json({ ok: true, message: genericMsg });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, message: "Falta JWT_SECRET en el servidor" });
    }

    const resetToken = jwt.sign(
      { id_usuario: user.id_usuario, correo: user.correo, purpose: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const front = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${front}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // Enviar correo por Gmail al usuario
    await sendResetEmail({ to: user.correo, resetUrl });

    return res.json({ ok: true, message: genericMsg });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error en recuperación" });
  }
});

/**
 * POST /api/auth/reset
 * body: { token, password }
 *
 * Cambia password_hash del usuario.
 */
router.post("/reset", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token) return res.status(400).json({ ok: false, message: "Falta token" });
    if (!password || password.length < 6) {
      return res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 6 caracteres" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, message: "Falta JWT_SECRET en el servidor" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, message: "Token inválido o expirado" });
    }

    if (payload?.purpose !== "reset" || !payload?.id_usuario) {
      return res.status(401).json({ ok: false, message: "Token inválido" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const pool = await getPool();
    const upd = await pool
      .request()
      .input("id", sql.Int, Number(payload.id_usuario))
      .input("password_hash", sql.VarChar(255), password_hash)
      .query(`UPDATE usuarios SET password_hash=@password_hash WHERE id_usuario=@id`);

    if (upd.rowsAffected?.[0] === 0) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    return res.json({ ok: true, message: "Contraseña actualizada" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error restableciendo contraseña" });
  }
});

export default router;