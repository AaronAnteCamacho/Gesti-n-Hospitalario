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
    console.warn("No se pudo crear notificación:", e?.message || e);
  }
}

// UI -> DB (varchar)
function boolPairToStr(okTrue, okFalse) {
  if (okTrue) return "CORRECTO";
  if (okFalse) return "INCORRECTO";
  return null;
}

// DB (varchar) -> UI pair
function strToBoolPair(v) {
  if (!v) return { okTrue: false, okFalse: false };
  const up = String(v).toUpperCase();
  if (up.includes("CORRECT")) return { okTrue: true, okFalse: false };
  if (up.includes("INCORRECT")) return { okTrue: false, okFalse: true };
  return { okTrue: false, okFalse: false };
}

// Convención de fecha para el grupo "SIN FECHA"
const NULL_DATE_TOKEN = "__NULL__";

/**
 * POST /api/bitacoras
 * Crea una fila de bitácora vinculada a un equipo.
 */
router.post("/", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const {
      id_equipo,
      fecha,
      funcionamiento_correcto,
      funcionamiento_incorrecto,
      sensores_correcto,
      sensores_incorrecto,
      requiere_reparacion_si,
      requiere_reparacion_no,
      observaciones,
    } = req.body || {};

    const idEquipo = Number(id_equipo);
    if (!idEquipo) return res.status(400).json({ ok: false, message: "Falta id_equipo" });

    const estado_funcionamiento = boolPairToStr(!!funcionamiento_correcto, !!funcionamiento_incorrecto);
    const sensores = boolPairToStr(!!sensores_correcto, !!sensores_incorrecto);

    let requiere_reparacion = null;
    if (requiere_reparacion_si) requiere_reparacion = 1;
    else if (requiere_reparacion_no) requiere_reparacion = 0;

    const fechaFinal = String(fecha || "").trim() || new Date().toISOString().slice(0, 10);

    const pool = await getPool();

    const eq = await pool
      .request()
      .input("id_equipo", sql.Int, idEquipo)
      .query(`
        SELECT TOP 1 id_equipo, numero_inventario, nombre_equipo
        FROM dbo.equipos
        WHERE id_equipo = @id_equipo
      `);

    const equipo = eq.recordset?.[0];
    if (!equipo) {
      return res.status(404).json({ ok: false, message: "El equipo no existe" });
    }

    const ins = await pool
      .request()
      .input("id_equipo", sql.Int, idEquipo)
      .input("fecha", sql.Date, fechaFinal)
      .input("estado", sql.VarChar(100), estado_funcionamiento)
      .input("sens", sql.VarChar(100), sensores)
      .input("rep", sql.Bit, requiere_reparacion)
      .input("obs", sql.VarChar(sql.MAX), (observaciones ?? "").toString())
      .input("id_usuario", sql.Int, req.user?.id_usuario || null)
      .query(`
        INSERT INTO dbo.bitacoras
          (id_equipo, fecha, estado_funcionamiento, sensores, requiere_reparacion, observaciones, id_usuario)
        OUTPUT INSERTED.id_bitacora
        VALUES
          (@id_equipo, @fecha, @estado, @sens, @rep, @obs, @id_usuario)
      `);

    await crearNotificacion(pool, {
      tipo: "bitacoras",
      accion: "agregado",
      mensaje: `Se reportó falla: ${equipo.numero_inventario} · ${equipo.nombre_equipo} (por ${req.user.nombre})`,
      id_usuario_origen: req.user.id_usuario,
      id_equipo: idEquipo,
    });

    return res.json({
      ok: true,
      data: {
        id_bitacora: ins.recordset?.[0]?.id_bitacora || null,
        fecha: fechaFinal,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error creando bitácora" });
  }
});

/**
 * GET /api/bitacoras
 * Devuelve agrupaciones por fecha (una "bitácora" por fecha).
 * Incluye una sección aparte para fecha NULL.
 */
router.get("/", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const pool = await getPool();

    // Importante: agrupamos por SOLO la fecha calendario.
    // Si la columna es datetime/datetime2 y tiene hora, esto evita que cada hora
    // se convierta en una bitácora distinta.
    const r = await pool.request().query(`
      SELECT
        CAST(b.fecha AS date) AS fecha_agrupada,
        COUNT(*) AS items_count,
        MIN(b.id_bitacora) AS any_id
      FROM dbo.bitacoras b
      WHERE b.fecha IS NOT NULL
      GROUP BY CAST(b.fecha AS date)

      UNION ALL

      SELECT
        CAST(NULL AS date) AS fecha_agrupada,
        COUNT(*) AS items_count,
        MIN(b.id_bitacora) AS any_id
      FROM dbo.bitacoras b
      WHERE b.fecha IS NULL
      HAVING COUNT(*) > 0

      ORDER BY fecha_agrupada DESC
    `);

    const withFecha = [];
    const sinFecha = [];

    for (const row of r.recordset) {
      const rawFecha = row.fecha_agrupada ?? row.fecha ?? null;
      const fecha = rawFecha ? new Date(rawFecha).toISOString().slice(0, 10) : null;
      const group = {
        id: fecha ?? NULL_DATE_TOKEN,
        nombre: fecha ? `Bitácora ${fecha}` : "Bitácoras sin fecha",
        fecha,
        itemsCount: Number(row.items_count || 0),
      };

      if (fecha) withFecha.push(group);
      else sinFecha.push(group);
    }

    return res.json({ ok: true, data: { withFecha, sinFecha, nullToken: NULL_DATE_TOKEN } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error listando bitácoras" });
  }
});

/**
 * GET /api/bitacoras/sheet?fecha=YYYY-MM-DD | __NULL__
 * Devuelve la "hoja" completa para esa fecha (o sin fecha).
 */
router.get("/sheet", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const fechaParam = String(req.query.fecha || "").trim();
    if (!fechaParam) return res.status(400).json({ ok: false, message: "Falta fecha" });

    const pool = await getPool();

    const isNull = fechaParam === NULL_DATE_TOKEN;
    const fechaSql = isNull ? null : fechaParam;

    const q = `
      SELECT
        b.id_bitacora,
        b.fecha,
        b.estado_funcionamiento,
        b.sensores,
        b.requiere_reparacion,
        b.observaciones,
        e.id_equipo,
        e.numero_inventario,
        e.nombre_equipo,
        e.marca,
        e.modelo,
        e.numero_serie,
        e.ubicacion_especifica
      FROM dbo.bitacoras b
      INNER JOIN dbo.equipos e ON e.id_equipo = b.id_equipo
      WHERE ${isNull ? "b.fecha IS NULL" : "CAST(b.fecha AS date) = @fecha"}
      ORDER BY e.numero_inventario ASC;
    `;

    const reqDb = pool.request();
    if (!isNull) reqDb.input("fecha", sql.Date, fechaSql);

    const r = await reqDb.query(q);

    const items = r.recordset.map((row) => {
      const func = strToBoolPair(row.estado_funcionamiento);
      const sens = strToBoolPair(row.sensores);
      const rep = row.requiere_reparacion;

      return {
        id_bitacora: row.id_bitacora,
        id_equipo: row.id_equipo,
        numero_inventario: row.numero_inventario,
        equipo: row.nombre_equipo,
        marca: row.marca,
        modelo: row.modelo,
        numero_serie: row.numero_serie,
        ubicacion_especifica: row.ubicacion_especifica,

        funcionamiento_correcto: func.okTrue,
        funcionamiento_incorrecto: func.okFalse,

        sensores_correcto: sens.okTrue,
        sensores_incorrecto: sens.okFalse,

        requiere_reparacion_si: rep === true || rep === 1,
        requiere_reparacion_no: rep === false || rep === 0,

        observaciones: row.observaciones || "",
      };
    });

    const fechaOut = isNull ? null : fechaParam;

    return res.json({
      ok: true,
      data: {
        id: fechaParam,
        nombre: fechaOut ? `Bitácora ${fechaOut}` : "Bitácoras sin fecha",
        fecha: fechaOut,
        items,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error cargando bitácora" });
  }
});

/**
 * PUT /api/bitacoras/entry
 * Actualiza una fila específica (por id_bitacora).
 * Body:
 * { id_bitacora, funcionamiento_correcto, funcionamiento_incorrecto, sensores_correcto, sensores_incorrecto,
 *   requiere_reparacion_si, requiere_reparacion_no, observaciones }
 */
router.put("/entry", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const {
      id_bitacora,
      funcionamiento_correcto,
      funcionamiento_incorrecto,
      sensores_correcto,
      sensores_incorrecto,
      requiere_reparacion_si,
      requiere_reparacion_no,
      observaciones,
    } = req.body || {};

    const id = Number(id_bitacora);
    if (!id) return res.status(400).json({ ok: false, message: "Falta id_bitacora" });

    const estado_funcionamiento = boolPairToStr(!!funcionamiento_correcto, !!funcionamiento_incorrecto);
    const sensores = boolPairToStr(!!sensores_correcto, !!sensores_incorrecto);

    let requiere_reparacion = null;
    if (requiere_reparacion_si) requiere_reparacion = 1;
    else if (requiere_reparacion_no) requiere_reparacion = 0;

    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("estado", sql.VarChar(100), estado_funcionamiento)
      .input("sens", sql.VarChar(100), sensores)
      .input("rep", sql.Bit, requiere_reparacion)
      .input("obs", sql.VarChar(sql.MAX), (observaciones ?? "").toString())
      .input("id_usuario", sql.Int, req.user?.id_usuario || null)
      .query(`
        UPDATE dbo.bitacoras
        SET estado_funcionamiento = @estado,
            sensores = @sens,
            requiere_reparacion = @rep,
            observaciones = @obs,
            id_usuario = COALESCE(@id_usuario, id_usuario)
        WHERE id_bitacora = @id;
      `);

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error guardando bitácora" });
  }
});

export default router;
