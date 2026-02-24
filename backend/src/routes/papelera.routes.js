import { Router } from "express";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

// GET /api/papelera
// - jefe: ve todo
// - empleado: ve solo lo que él mandó a papelera
router.get(
  "/",
  requireAuth,
  allowRoles("jefe", "empleado"),
  async (req, res) => {
    try {
      const pool = await getPool();
      const isJefe = req.user?.rol === "jefe";

      const q = isJefe
        ? `
          SELECT
            e.id_equipo,
            e.numero_inventario,
            e.nombre_equipo,
            e.marca,
            e.modelo,
            e.numero_serie,
            e.ubicacion_especifica,
            e.id_categoria,
            e.id_area,
            e.activo,
            e.fecha_registro,

            e.motivo_papelera AS motivo,
            e.id_usuario_papelera AS id_usuario,
            e.fecha_papelera AS fecha_borrado,

            u.nombre AS usuario_nombre,
            u.correo AS usuario_correo
          FROM dbo.equipos e
          LEFT JOIN dbo.usuarios u ON u.id_usuario = e.id_usuario_papelera
          WHERE e.en_papelera = 1
          ORDER BY e.fecha_papelera DESC, e.id_equipo DESC
        `
        : `
          SELECT
            e.id_equipo,
            e.numero_inventario,
            e.nombre_equipo,
            e.marca,
            e.modelo,
            e.numero_serie,
            e.ubicacion_especifica,
            e.id_categoria,
            e.id_area,
            e.activo,
            e.fecha_registro,

            e.motivo_papelera AS motivo,
            e.id_usuario_papelera AS id_usuario,
            e.fecha_papelera AS fecha_borrado,

            u.nombre AS usuario_nombre,
            u.correo AS usuario_correo
          FROM dbo.equipos e
          LEFT JOIN dbo.usuarios u ON u.id_usuario = e.id_usuario_papelera
          WHERE e.en_papelera = 1 AND e.id_usuario_papelera = @id_usuario
          ORDER BY e.fecha_papelera DESC, e.id_equipo DESC
        `;

      const r = await pool
        .request()
        .input("id_usuario", sql.Int, req.user.id_usuario)
        .query(q);

      res.json({ ok: true, data: r.recordset });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Error consultando papelera" });
    }
  }
);

// POST /api/papelera/:id/restore  (solo jefe)
// Restaura: solo saca de papelera (no toca activo)
router.post(
  "/:id/restore",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      const pool = await getPool();

      const r = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          UPDATE dbo.equipos
          SET
            en_papelera = 0,
            motivo_papelera = NULL,
            fecha_papelera = NULL,
            id_usuario_papelera = NULL
          WHERE id_equipo = @id AND en_papelera = 1
        `);

      if (r.rowsAffected?.[0] === 0) {
        return res.status(404).json({ ok: false, message: "No encontrado / no estaba en papelera" });
      }

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Error restaurando" });
    }
  }
);

// DELETE /api/papelera/:id  (solo jefe)
// Elimina definitivamente un equipo que esté en papelera.
router.delete(
  "/:id",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      const pool = await getPool();

      const r = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`
          DELETE FROM dbo.equipos
          WHERE id_equipo = @id AND en_papelera = 1
        `);

      if (r.rowsAffected?.[0] === 0) {
        return res.status(404).json({ ok: false, message: "No encontrado / no estaba en papelera" });
      }

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      // Si hay llaves foráneas u otras restricciones, SQL Server lanzará error.
      res.status(500).json({ ok: false, message: "Error eliminando definitivamente" });
    }
  }
);

export default router;
