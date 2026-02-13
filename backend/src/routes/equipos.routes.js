import { Router } from "express";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

/**
 * ROLES (solo 2):
 * - jefe: CRUD completo
 * - empleado: solo lectura (GET)
 */

// GET /api/equipos  (jefe y empleado)
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
        WHERE e.activo = 1
        ORDER BY e.id_equipo DESC
      `);

      return res.json({ ok: true, data: result.recordset });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error consultando equipos" });
    }
  }
);

// POST /api/equipos  (solo jefe)
router.post(
  "/",
  requireAuth,
  allowRoles("jefe"),
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

      if (!numero_inventario || !nombre_equipo || !id_categoria || !id_area) {
        return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
      }

      const pool = await getPool();

      const result = await pool
        .request()
        .input("numero_inventario", sql.VarChar(50), numero_inventario)
        .input("nombre_equipo", sql.VarChar(150), nombre_equipo)
        .input("marca", sql.VarChar(50), marca || null)
        .input("modelo", sql.VarChar(50), modelo || null)
        .input("numero_serie", sql.VarChar(50), numero_serie || null)
        .input("ubicacion_especifica", sql.VarChar(100), ubicacion_especifica || null)
        .input("id_categoria", sql.Int, id_categoria)
        .input("id_area", sql.Int, id_area)
        .input("activo", sql.Bit, activo ? 1 : 0)
        .query(`
          INSERT INTO equipos
          (numero_inventario, nombre_equipo, marca, modelo, numero_serie, ubicacion_especifica, id_categoria, id_area, activo)
          OUTPUT INSERTED.id_equipo
          VALUES
          (@numero_inventario, @nombre_equipo, @marca, @modelo, @numero_serie, @ubicacion_especifica, @id_categoria, @id_area, @activo)
        `);

      return res.json({ ok: true, id_equipo: result.recordset[0].id_equipo });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error creando equipo" });
    }
  }
);

// PUT /api/equipos/:id  (solo jefe)
router.put(
  "/:id",
  requireAuth,
  allowRoles("jefe"),
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

      if (!id || !numero_inventario || !nombre_equipo || !id_categoria || !id_area) {
        return res.status(400).json({ ok: false, message: "Faltan campos obligatorios" });
      }

      const pool = await getPool();
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("numero_inventario", sql.VarChar(50), numero_inventario)
        .input("nombre_equipo", sql.VarChar(150), nombre_equipo)
        .input("marca", sql.VarChar(50), marca || null)
        .input("modelo", sql.VarChar(50), modelo || null)
        .input("numero_serie", sql.VarChar(50), numero_serie || null)
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

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error actualizando equipo" });
    }
  }
);

// POST /api/equipos/:id/trash  (jefe y empleado)
// Mueve a papelera (soft delete): guarda snapshot + motivo y desactiva equipo
router.post(
  "/:id/trash",
  requireAuth,
  allowRoles("jefe", "empleado"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { motivo } = req.body;

      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });
      if (!motivo || !String(motivo).trim()) {
        return res.status(400).json({ ok: false, message: "Motivo requerido" });
      }

      const pool = await getPool();

      // Traer snapshot
      const snap = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          SELECT TOP 1
            id_equipo, numero_inventario, nombre_equipo, marca, modelo, numero_serie,
            ubicacion_especifica, id_categoria, id_area
          FROM equipos
          WHERE id_equipo=@id
        `);

      const row = snap.recordset[0];
      if (!row) return res.status(404).json({ ok: false, message: "Equipo no encontrado" });

      // Guardar en papelera
      await pool
        .request()
        .input("id_equipo", sql.Int, row.id_equipo)
        .input("numero_inventario", sql.VarChar(50), row.numero_inventario)
        .input("nombre_equipo", sql.VarChar(150), row.nombre_equipo)
        .input("marca", sql.VarChar(50), row.marca || null)
        .input("modelo", sql.VarChar(50), row.modelo || null)
        .input("numero_serie", sql.VarChar(50), row.numero_serie || null)
        .input("ubicacion_especifica", sql.VarChar(100), row.ubicacion_especifica || null)
        .input("id_categoria", sql.Int, row.id_categoria)
        .input("id_area", sql.Int, row.id_area)
        .input("motivo", sql.VarChar(500), String(motivo).trim())
        .input("id_usuario", sql.Int, req.user?.id_usuario)
        .query(`
          INSERT INTO equipos_papelera
          (id_equipo, numero_inventario, nombre_equipo, marca, modelo, numero_serie, ubicacion_especifica, id_categoria, id_area, motivo, id_usuario)
          VALUES
          (@id_equipo, @numero_inventario, @nombre_equipo, @marca, @modelo, @numero_serie, @ubicacion_especifica, @id_categoria, @id_area, @motivo, @id_usuario)
        `);

      // Soft delete
      await pool
        .request()
        .input("id", sql.Int, id)
        .query(`UPDATE equipos SET activo=0 WHERE id_equipo=@id`);

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error enviando a papelera" });
    }
  }
);

// POST /api/equipos/:id/trash  (jefe y empleado)
// Mueve a papelera (soft delete): guarda snapshot + motivo + usuario y pone activo=0
router.post(
  "/:id/trash",
  requireAuth,
  allowRoles("jefe", "empleado"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const motivo = String(req.body?.motivo || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });
      if (!motivo) return res.status(400).json({ ok: false, message: "Falta motivo" });

      const pool = await getPool();

      // 1) Leer snapshot
      const snap = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          SELECT TOP 1
            id_equipo, numero_inventario, nombre_equipo, marca, modelo, numero_serie,
            ubicacion_especifica, id_categoria, id_area
          FROM equipos
          WHERE id_equipo=@id
        `);

      const row = snap.recordset?.[0];
      if (!row) return res.status(404).json({ ok: false, message: "Equipo no encontrado" });

      // 2) Insert en papelera
      await pool
        .request()
        .input("id_equipo", sql.Int, row.id_equipo)
        .input("numero_inventario", sql.VarChar(50), row.numero_inventario || null)
        .input("nombre_equipo", sql.VarChar(150), row.nombre_equipo || null)
        .input("marca", sql.VarChar(50), row.marca || null)
        .input("modelo", sql.VarChar(50), row.modelo || null)
        .input("numero_serie", sql.VarChar(50), row.numero_serie || null)
        .input("ubicacion_especifica", sql.VarChar(100), row.ubicacion_especifica || null)
        .input("id_categoria", sql.Int, row.id_categoria || null)
        .input("id_area", sql.Int, row.id_area || null)
        .input("motivo", sql.VarChar(500), motivo)
        .input("id_usuario", sql.Int, req.user.id_usuario)
        .query(`
          INSERT INTO equipos_papelera
          (id_equipo, numero_inventario, nombre_equipo, marca, modelo, numero_serie, ubicacion_especifica, id_categoria, id_area, motivo, id_usuario)
          VALUES
          (@id_equipo, @numero_inventario, @nombre_equipo, @marca, @modelo, @numero_serie, @ubicacion_especifica, @id_categoria, @id_area, @motivo, @id_usuario)
        `);

      // 3) Soft delete
      await pool
        .request()
        .input("id", sql.Int, id)
        .query(`UPDATE equipos SET activo=0 WHERE id_equipo=@id`);

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error moviendo a papelera" });
    }
  }
);

export default router;
