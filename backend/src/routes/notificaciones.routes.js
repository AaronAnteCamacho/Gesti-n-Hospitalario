import { Router } from "express";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

// ✅ Solo el rol "jefe" puede ver/consumir notificaciones

// GET /api/notificaciones?unread=1&limit=30
router.get(
  "/",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const unread = req.query.unread;
      const onlyUnread = unread === "1" || unread === "true";
      const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);

      const pool = await getPool();

      const r = await pool
        .request()
        .input("limit", sql.Int, limit)
        .input("onlyUnread", sql.Bit, onlyUnread ? 1 : 0)
        .query(`
          SELECT TOP (@limit)
            n.id_notificacion,
            n.tipo,
            n.accion,
            n.mensaje,
            n.fecha_creacion,
            n.leida,
            u.nombre AS usuario_origen,
            e.numero_inventario,
            e.nombre_equipo
          FROM notificaciones n
          INNER JOIN usuarios u ON u.id_usuario = n.id_usuario_origen
          LEFT JOIN equipos e ON e.id_equipo = n.id_equipo
          WHERE (@onlyUnread = 0 OR n.leida = 0)
          ORDER BY n.id_notificacion DESC
        `);

      return res.json({ ok: true, data: r.recordset || [] });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error consultando notificaciones" });
    }
  }
);

// PATCH /api/notificaciones/:id/read
router.patch(
  "/:id/read",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

      const pool = await getPool();
      await pool
        .request()
        .input("id", sql.Int, id)
        .query(`UPDATE notificaciones SET leida = 1 WHERE id_notificacion = @id`);

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error marcando notificación" });
    }
  }
);

// PATCH /api/notificaciones/read-all
router.patch(
  "/read-all",
  requireAuth,
  allowRoles("jefe"),
  async (req, res) => {
    try {
      const pool = await getPool();
      await pool.request().query(`UPDATE notificaciones SET leida = 1 WHERE leida = 0`);
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Error marcando todas" });
    }
  }
);

export default router;
