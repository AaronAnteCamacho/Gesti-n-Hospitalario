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

// DELETE /api/equipos/:id  (solo jefe)
router.delete(
  "/:id",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const pool = await getPool();
      await pool.request().input("id", sql.Int, id).query(`DELETE FROM equipos WHERE id_equipo=@id`);
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error eliminando equipo" });
    }
  }
);

export default router;
