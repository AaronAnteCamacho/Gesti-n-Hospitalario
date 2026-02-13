import { Router } from "express";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

// GET /api/papelera
// - jefe: ve todo
// - empleado: ve solo lo que él borró
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
            p.id_papelera,
            p.id_equipo,
            p.numero_inventario,
            p.nombre_equipo,
            p.marca,
            p.modelo,
            p.numero_serie,
            p.ubicacion_especifica,
            p.id_categoria,
            p.id_area,
            p.motivo,
            p.id_usuario,
            p.fecha_borrado,
            u.nombre AS usuario_nombre,
            u.correo AS usuario_correo
          FROM equipos_papelera p
          LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
          ORDER BY p.fecha_borrado DESC, p.id_papelera DESC
        `
        : `
          SELECT
            p.id_papelera,
            p.id_equipo,
            p.numero_inventario,
            p.nombre_equipo,
            p.marca,
            p.modelo,
            p.numero_serie,
            p.ubicacion_especifica,
            p.id_categoria,
            p.id_area,
            p.motivo,
            p.id_usuario,
            p.fecha_borrado,
            u.nombre AS usuario_nombre,
            u.correo AS usuario_correo
          FROM equipos_papelera p
          LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
          WHERE p.id_usuario = @id_usuario
          ORDER BY p.fecha_borrado DESC, p.id_papelera DESC
        `;

      const r = await pool.request()
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
router.post(
  "/:id/restore",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      const pool = await getPool();

      const r = await pool.request()
        .input("id", sql.Int, id)
        .query(`SELECT TOP 1 * FROM equipos_papelera WHERE id_papelera=@id`);

      const row = r.recordset?.[0];
      if (!row) return res.status(404).json({ ok: false, message: "No encontrado" });

      // Reactivar equipo
      await pool.request()
        .input("id_equipo", sql.Int, row.id_equipo)
        .query(`UPDATE equipos SET activo=1 WHERE id_equipo=@id_equipo`);

      // Eliminar de papelera
      await pool.request()
        .input("id", sql.Int, id)
        .query(`DELETE FROM equipos_papelera WHERE id_papelera=@id`);

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Error restaurando" });
    }
  }
);

export default router;
