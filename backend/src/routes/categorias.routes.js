import { Router } from "express";
import { getPool } from "../config/db.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET /api/categorias
router.get("/", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id_categoria, nombre_categoria
      FROM categorias_equipo
      ORDER BY id_categoria ASC
    `);

    return res.json({ ok: true, data: result.recordset });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error consultando categorías" });
  }
});

export default router;
