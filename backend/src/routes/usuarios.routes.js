import { Router } from "express";
import bcrypt from "bcryptjs";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

// GET /api/usuarios/me (cualquier usuario autenticado)
router.get(
  "/me",
  requireAuth,
  async (req, res) => {
    try {
      const id = Number(req.user?.id_usuario);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      const pool = await getPool();
      const r = await pool.request().input("id", sql.Int, id).query(`
        SELECT
          u.id_usuario,
          u.nombre,
          u.correo,
          r.nombre_rol AS rol,
          u.activo,
          u.fecha_creacion
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario=@id
      `);

      const me = r.recordset?.[0];
      if (!me) return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
      res.json({ ok: true, data: me });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Error consultando perfil" });
    }
  }
);

// PUT /api/usuarios/me (cualquier usuario autenticado)
// body: { nombre, correo, password? }
router.put(
  "/me",
  requireAuth,
  async (req, res) => {
    try {
      const id = Number(req.user?.id_usuario);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      const nombre = String(req.body?.nombre || "").trim();
      const correo = String(req.body?.correo || "").trim();
      const password = String(req.body?.password || "");

      if (!nombre || !correo) {
        return res.status(400).json({ ok: false, message: "Faltan campos" });
      }

      const pool = await getPool();

      if (password) {
        const password_hash = await bcrypt.hash(password, 10);
        await pool
          .request()
          .input("id", sql.Int, id)
          .input("nombre", sql.VarChar(150), nombre)
          .input("correo", sql.VarChar(100), correo)
          .input("password_hash", sql.VarChar(255), password_hash)
          .query(`
            UPDATE usuarios
            SET nombre=@nombre, correo=@correo, password_hash=@password_hash
            WHERE id_usuario=@id
          `);
      } else {
        await pool
          .request()
          .input("id", sql.Int, id)
          .input("nombre", sql.VarChar(150), nombre)
          .input("correo", sql.VarChar(100), correo)
          .query(`
            UPDATE usuarios
            SET nombre=@nombre, correo=@correo
            WHERE id_usuario=@id
          `);
      }

      // devolver el perfil actualizado
      const rr = await pool.request().input("id", sql.Int, id).query(`
        SELECT
          u.id_usuario,
          u.nombre,
          u.correo,
          r.nombre_rol AS rol,
          u.activo,
          u.fecha_creacion
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario=@id
      `);

      res.json({ ok: true, data: rr.recordset?.[0] || null });
    } catch (e) {
      console.error(e);
      if (String(e?.message || "").toLowerCase().includes("unique")) {
        return res.status(400).json({ ok: false, message: "Ese correo ya existe" });
      }
      res.status(500).json({ ok: false, message: "Error actualizando perfil" });
    }
  }
);

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

      const newId = ins.recordset?.[0]?.id_usuario;
      const rr = await pool.request().input("id", sql.Int, newId).query(`
        SELECT
          u.id_usuario,
          u.nombre,
          u.correo,
          r.nombre_rol AS rol,
          u.activo,
          u.fecha_creacion
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario=@id
      `);

      res.json({ ok: true, id_usuario: newId, data: rr.recordset?.[0] || null });
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

// PUT /api/usuarios/:id (solo jefe)
// body: { nombre, correo, rol, activo, password? }
router.put(
  "/:id",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      const nombre = String(req.body?.nombre || "").trim();
      const correo = String(req.body?.correo || "").trim();
      const rol = String(req.body?.rol || "empleado").trim().toLowerCase();
      const activo = req.body?.activo;
      const password = String(req.body?.password || "");

      if (!nombre || !correo) {
        return res.status(400).json({ ok: false, message: "Faltan campos" });
      }
      if (rol !== "jefe" && rol !== "empleado") {
        return res.status(400).json({ ok: false, message: "Rol inválido" });
      }
      const activoBit = (activo === false || activo === 0 || activo === "0") ? 0 : 1;

      const pool = await getPool();

      const rolRow = await pool
        .request()
        .input("nombre_rol", sql.VarChar(50), rol)
        .query(`SELECT TOP 1 id_rol FROM roles WHERE nombre_rol=@nombre_rol`);

      const id_rol = rolRow.recordset?.[0]?.id_rol;
      if (!id_rol) return res.status(400).json({ ok: false, message: "Rol no existe en BD" });

      if (password) {
        const password_hash = await bcrypt.hash(password, 10);
        await pool
          .request()
          .input("id", sql.Int, id)
          .input("nombre", sql.VarChar(150), nombre)
          .input("correo", sql.VarChar(100), correo)
          .input("id_rol", sql.Int, id_rol)
          .input("activo", sql.Bit, activoBit)
          .input("password_hash", sql.VarChar(255), password_hash)
          .query(`
            UPDATE usuarios
            SET nombre=@nombre, correo=@correo, id_rol=@id_rol, activo=@activo, password_hash=@password_hash
            WHERE id_usuario=@id
          `);
      } else {
        await pool
          .request()
          .input("id", sql.Int, id)
          .input("nombre", sql.VarChar(150), nombre)
          .input("correo", sql.VarChar(100), correo)
          .input("id_rol", sql.Int, id_rol)
          .input("activo", sql.Bit, activoBit)
          .query(`
            UPDATE usuarios
            SET nombre=@nombre, correo=@correo, id_rol=@id_rol, activo=@activo
            WHERE id_usuario=@id
          `);
      }

      const rr = await pool.request().input("id", sql.Int, id).query(`
        SELECT
          u.id_usuario,
          u.nombre,
          u.correo,
          r.nombre_rol AS rol,
          u.activo,
          u.fecha_creacion
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario=@id
      `);

      res.json({ ok: true, data: rr.recordset?.[0] || null });
    } catch (e) {
      console.error(e);
      if (String(e?.message || "").toLowerCase().includes("unique")) {
        return res.status(400).json({ ok: false, message: "Ese correo ya existe" });
      }
      res.status(500).json({ ok: false, message: "Error actualizando usuario" });
    }
  }
);

// DELETE /api/usuarios/:id (solo jefe)
router.delete(
  "/:id",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    const USUARIO_ELIMINADO_ID = 19;
    let tx;

    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({ ok: false, message: "ID inválido" });
      }

      if (req.user?.id_usuario === id) {
        return res.status(400).json({
          ok: false,
          message: "No puedes borrarte a ti mismo",
        });
      }

      if (id === USUARIO_ELIMINADO_ID) {
        return res.status(400).json({
          ok: false,
          message: "No puedes eliminar el usuario comodín",
        });
      }

      const pool = await getPool();
      tx = new sql.Transaction(pool);
      await tx.begin();

      const rNotif = await new sql.Request(tx)
        .input("id", sql.Int, id)
        .input("uid", sql.Int, USUARIO_ELIMINADO_ID)
        .query(`
          UPDATE notificaciones
          SET id_usuario_origen = @uid
          WHERE id_usuario_origen = @id;
        `);

      const rEquipos = await new sql.Request(tx)
        .input("id", sql.Int, id)
        .input("uid", sql.Int, USUARIO_ELIMINADO_ID)
        .query(`
          UPDATE equipos
          SET id_usuario_papelera = @uid
          WHERE id_usuario_papelera = @id;
        `);

      const rBit = await new sql.Request(tx)
        .input("id", sql.Int, id)
        .input("uid", sql.Int, USUARIO_ELIMINADO_ID)
        .query(`
          UPDATE bitacoras
          SET id_usuario = @uid
          WHERE id_usuario = @id;
        `);

      console.log("Limpieza usuario:", {
        id,
        uid: USUARIO_ELIMINADO_ID,
        notificaciones: rNotif.rowsAffected?.[0] || 0,
        equipos: rEquipos.rowsAffected?.[0] || 0,
        bitacoras: rBit.rowsAffected?.[0] || 0,
      });

      const rDelete = await new sql.Request(tx)
        .input("id", sql.Int, id)
        .query(`
          DELETE FROM usuarios
          WHERE id_usuario = @id;
        `);

      console.log("Usuario eliminado:", {
        id,
        eliminados: rDelete.rowsAffected?.[0] || 0,
      });

      await tx.commit();

      return res.json({
        ok: true,
        message: "Usuario eliminado permanentemente",
      });
    } catch (e) {
      if (tx) {
        try { await tx.rollback(); } catch {}
      }

      console.error("Error eliminando usuario:", e);

      return res.status(500).json({
        ok: false,
        message: e?.message || "Error eliminando usuario",
      });
    }
  }
);
export default router;
