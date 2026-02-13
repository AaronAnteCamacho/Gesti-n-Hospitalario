import { Router } from "express";
import bcrypt from "bcryptjs";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

// GET /api/usuarios (solo jefe)
router.get(
  "/",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const pool = await getPool();
      const r = await pool.request().query(`
        SELECT
          u.id_usuario,
          u.nombre,
          u.correo,
          r.nombre_rol AS rol,
          u.activo,
          u.fecha_creacion
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        ORDER BY u.id_usuario DESC
      `);
      res.json({ ok: true, data: r.recordset });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Error consultando usuarios" });
    }
  }
);

// POST /api/usuarios (solo jefe)
// body: { nombre, correo, password, rol }
router.post(
  "/",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const nombre = String(req.body?.nombre || "").trim();
      const correo = String(req.body?.correo || "").trim();
      const password = String(req.body?.password || "");
      const rol = String(req.body?.rol || "empleado").trim().toLowerCase();

      if (!nombre || !correo || !password) {
        return res.status(400).json({ ok: false, message: "Faltan campos" });
      }
      if (rol !== "jefe" && rol !== "empleado") {
        return res.status(400).json({ ok: false, message: "Rol inválido" });
      }

      const pool = await getPool();

      const rolRow = await pool.request()
        .input("nombre_rol", sql.VarChar(50), rol)
        .query(`SELECT TOP 1 id_rol FROM roles WHERE nombre_rol=@nombre_rol`);

      const id_rol = rolRow.recordset?.[0]?.id_rol;
      if (!id_rol) return res.status(400).json({ ok: false, message: "Rol no existe en BD" });

      const password_hash = await bcrypt.hash(password, 10);

      const ins = await pool.request()
        .input("nombre", sql.VarChar(150), nombre)
        .input("correo", sql.VarChar(100), correo)
        .input("password_hash", sql.VarChar(255), password_hash)
        .input("id_rol", sql.Int, id_rol)
        .query(`
          INSERT INTO usuarios (nombre, correo, password_hash, id_rol)
          OUTPUT INSERTED.id_usuario
          VALUES (@nombre, @correo, @password_hash, @id_rol)
        `);

      res.json({ ok: true, id_usuario: ins.recordset?.[0]?.id_usuario });
    } catch (e) {
      console.error(e);
      // violación UNIQUE correo
      if (String(e?.message || "").toLowerCase().includes("unique")) {
        return res.status(400).json({ ok: false, message: "Ese correo ya existe" });
      }
      res.status(500).json({ ok: false, message: "Error creando usuario" });
    }
  }
);

// DELETE /api/usuarios/:id (solo jefe)
router.delete(
  "/:id",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      // Evitar que el jefe se borre a sí mismo por accidente
      if (req.user?.id_usuario === id) {
        return res.status(400).json({ ok: false, message: "No puedes borrarte a ti mismo" });
      }

      const pool = await getPool();
      await pool.request().input("id", sql.Int, id).query(`DELETE FROM usuarios WHERE id_usuario=@id`);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Error eliminando usuario" });
    }
  }
);

export default router;
