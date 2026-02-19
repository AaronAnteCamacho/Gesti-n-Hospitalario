import { Router } from "express";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

async function crearNotificacion(pool, { tipo, accion, mensaje, id_usuario_origen, id_equipo = null }) {
  try {
    await pool
      .request()
      .input("tipo", sql.VarChar(30), tipo)
      .input("accion", sql.VarChar(30), accion)
      .input("mensaje", sql.VarChar(300), mensaje)
      .input("id_usuario_origen", sql.Int, id_usuario_origen)
      .input("id_equipo", sql.Int, id_equipo)
      .query(`
        INSERT INTO notificaciones (tipo, accion, mensaje, id_usuario_origen, id_equipo, leida)
        VALUES (@tipo, @accion, @mensaje, @id_usuario_origen, @id_equipo, 0)
      `);
  } catch (e) {
    // No rompemos la acción principal si falla notificación
    console.warn("No se pudo crear notificación:", e?.message || e);
  }
}

// GET /api/equipos  (jefe y empleado) -> fuera de papelera
router.get(
  "/",
  requireAuth,
  allowRoles("jefe", "empleado"),
  async (req, res) => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT 
          e.id_equipo, e.numero_inventario, e.nombre_equipo, e.marca, e.modelo, e.numero_serie,
          e.ubicacion_especifica, e.activo, e.fecha_registro,
          c.id_categoria, c.nombre_categoria,
          a.id_area, a.nombre_area
        FROM equipos e
        INNER JOIN categorias_equipo c ON c.id_categoria = e.id_categoria
        INNER JOIN areas_hospital a ON a.id_area = e.id_area
        WHERE e.en_papelera = 0
        ORDER BY e.id_equipo DESC
      `);

      return res.json({ ok: true, data: result.recordset });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error consultando equipos" });
    }
  }
);

// POST /api/equipos  (jefe/empleado según tu sistema)
router.post(
  "/",
  requireAuth,
  allowRoles("jefe", "empleado"),
  async (req, res) => {
    try {
      const {
        numero_inventario,
        nombre_equipo,
        marca,
        modelo,
        numero_serie,
        ubicacion_especifica,
        id_categoria,
        id_area,
        activo = 1,
      } = req.body;

      // ✅ obligatorios (lo que pediste)
      if (!numero_inventario || !nombre_equipo || !numero_serie || !id_categoria || !id_area) {
        return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
      }

      const pool = await getPool();

      // ✅ duplicado inventario en BD
      const dup = await pool
        .request()
        .input("numero_inventario", sql.VarChar(50), numero_inventario)
        .query(`SELECT TOP 1 id_equipo FROM equipos WHERE numero_inventario = @numero_inventario`);

      if (dup.recordset?.length) {
        return res.status(409).json({ ok: false, message: "El No. inventario ya existe" });
      }

      const result = await pool
        .request()
        .input("numero_inventario", sql.VarChar(50), numero_inventario)
        .input("nombre_equipo", sql.VarChar(150), nombre_equipo)
        .input("marca", sql.VarChar(50), marca || null)
        .input("modelo", sql.VarChar(50), modelo || null)
        .input("numero_serie", sql.VarChar(50), numero_serie)
        .input("ubicacion_especifica", sql.VarChar(100), ubicacion_especifica || null)
        .input("id_categoria", sql.Int, id_categoria)
        .input("id_area", sql.Int, id_area)
        .input("activo", sql.Bit, activo ? 1 : 0)
        .query(`
          INSERT INTO equipos
          (numero_inventario, nombre_equipo, marca, modelo, numero_serie, ubicacion_especifica, id_categoria, id_area, activo, en_papelera)
          OUTPUT INSERTED.id_equipo
          VALUES
          (@numero_inventario, @nombre_equipo, @marca, @modelo, @numero_serie, @ubicacion_especifica, @id_categoria, @id_area, @activo, 0)
        `);

      await crearNotificacion(pool, {
        tipo: "equipos",
        accion: "agregado",
        mensaje: `Se agregó equipo: ${numero_inventario} · ${nombre_equipo} (por ${req.user.nombre})`,
        id_usuario_origen: req.user.id_usuario,
        id_equipo: result.recordset[0].id_equipo,
      });

      return res.json({ ok: true, data: { id_equipo: result.recordset[0].id_equipo } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error creando equipo" });
    }
  }
);

// PUT /api/equipos/:id  (jefe/empleado según tu sistema)
router.put(
  "/:id",
  requireAuth,
  allowRoles("jefe", "empleado"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const {
        numero_inventario,
        nombre_equipo,
        marca,
        modelo,
        numero_serie,
        ubicacion_especifica,
        id_categoria,
        id_area,
        activo = 1,
      } = req.body;

      // ✅ obligatorios (lo que pediste)
      if (!id || !numero_inventario || !nombre_equipo || !numero_serie || !id_categoria || !id_area) {
        return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
      }

      const pool = await getPool();

      // ✅ duplicado inventario en BD, ignorando el mismo id
      const dup = await pool.request()
        .input("numero_inventario", sql.VarChar(50), numero_inventario)
        .input("id", sql.Int, id)
        .query(`
          SELECT TOP 1 id_equipo
          FROM equipos
          WHERE numero_inventario = @numero_inventario
            AND id_equipo <> @id
        `);

      if (dup.recordset?.length) {
        return res.status(409).json({ ok: false, message: "El No. inventario ya existe" });
      }

      await pool
        .request()
        .input("id", sql.Int, id)
        .input("numero_inventario", sql.VarChar(50), numero_inventario)
        .input("nombre_equipo", sql.VarChar(150), nombre_equipo)
        .input("marca", sql.VarChar(50), marca || null)
        .input("modelo", sql.VarChar(50), modelo || null)
        .input("numero_serie", sql.VarChar(50), numero_serie)
        .input("ubicacion_especifica", sql.VarChar(100), ubicacion_especifica || null)
        .input("id_categoria", sql.Int, id_categoria)
        .input("id_area", sql.Int, id_area)
        .input("activo", sql.Bit, activo ? 1 : 0)
        .query(`
          UPDATE equipos SET
            numero_inventario=@numero_inventario,
            nombre_equipo=@nombre_equipo,
            marca=@marca,
            modelo=@modelo,
            numero_serie=@numero_serie,
            ubicacion_especifica=@ubicacion_especifica,
            id_categoria=@id_categoria,
            id_area=@id_area,
            activo=@activo
          WHERE id_equipo=@id
        `);

      await crearNotificacion(pool, {
        tipo: "equipos",
        accion: "editado",
        mensaje: `Se editó equipo: ${numero_inventario} · ${nombre_equipo} (por ${req.user.nombre})`,
        id_usuario_origen: req.user.id_usuario,
        id_equipo: id,
      });

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error actualizando equipo" });
    }
  }
);

// POST /api/equipos/:id/trash  (jefe y empleado)
router.post(
  "/:id/trash",
  requireAuth,
  allowRoles("jefe", "empleado"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const motivo = String(req.body?.motivo || "").trim();

      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });
      if (!motivo) return res.status(400).json({ ok: false, message: "Motivo requerido" });

      const pool = await getPool();

      const info = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`SELECT TOP 1 numero_inventario, nombre_equipo FROM equipos WHERE id_equipo = @id`);

      const ni = info.recordset?.[0]?.numero_inventario || `ID ${id}`;
      const ne = info.recordset?.[0]?.nombre_equipo || "";

      const r = await pool
        .request()
        .input("id", sql.Int, id)
        .input("motivo", sql.VarChar(500), motivo)
        .input("id_usuario", sql.Int, req.user.id_usuario)
        .query(`
          UPDATE dbo.equipos
          SET
            en_papelera = 1,
            motivo_papelera = @motivo,
            fecha_papelera = GETDATE(),
            id_usuario_papelera = @id_usuario
          WHERE id_equipo = @id AND en_papelera = 0
        `);

      if (r.rowsAffected?.[0] === 0) {
        return res.status(400).json({ ok: false, message: "No se pudo enviar (ya estaba en papelera o no existe)" });
      }

      await crearNotificacion(pool, {
        tipo: "equipos",
        accion: "borrado",
        mensaje: `Se envió a papelera: ${ni}${ne ? ` · ${ne}` : ""} (por ${req.user.nombre})`,
        id_usuario_origen: req.user.id_usuario,
        id_equipo: id,
      });

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error enviando a papelera" });
    }
  }
);

export default router;
