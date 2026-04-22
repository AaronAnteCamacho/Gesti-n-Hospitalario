import { Router } from "express";
import { getPool, sql } from "../config/db.js";
import { requireAuth, allowRoles } from "../middlewares/auth.js";

const router = Router();

function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

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

/**
 * GET /api/formularios
 * Regresa pendientes y terminados.
 * Pendiente = actividades_realizadas vacío
 * Terminado = actividades_realizadas con contenido
 */
router.get("/", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const pool = await getPool();

    const r = await pool.request().query(`
      SELECT
        f.id_formulario,
        f.id_equipo,
        CONVERT(varchar(10), f.fecha, 23) AS fecha,
        CONVERT(varchar(8), f.hora_inicio, 108) AS hora_inicio,
        CONVERT(varchar(8), f.hora_fin, 108) AS hora_fin,
        f.area_servicio,
        f.falla_reportada,
        f.actividades_realizadas,
        f.refacciones_utilizadas,
        f.observaciones,
        f.id_usuario,
        f.firma_url,

        e.numero_inventario,
        e.nombre_equipo,
        e.marca,
        e.modelo,
        e.numero_serie,

        u.nombre AS usuario_nombre
      FROM dbo.formularios_servicio f
      INNER JOIN dbo.equipos e ON e.id_equipo = f.id_equipo
      LEFT JOIN dbo.usuarios u ON u.id_usuario = f.id_usuario
      ORDER BY f.id_formulario DESC
    `);

    const pendientes = [];
    const terminados = [];

    for (const row of r.recordset || []) {
      const item = {
        id_formulario: row.id_formulario,
        id_equipo: row.id_equipo,
        serie: row.numero_serie || "S/N",
        nombre: row.nombre_equipo || "",
        fecha: row.fecha || "",
        fecha_termino: row.fecha || "",
        area: row.area_servicio || "—",
        inventario: row.numero_inventario || "",
        marca: row.marca || "",
        modelo: row.modelo || "",
        falla: row.falla_reportada || "",
        actividades: row.actividades_realizadas || "",
        refacciones: row.refacciones_utilizadas || "",
        observaciones: row.observaciones || "",
        tecnico: row.firma_url || row.usuario_nombre || "",
        reporto: row.usuario_nombre || "—",
        inicio: row.fecha || "",
        hora_inicio: row.hora_inicio || "",
        hora_fin: row.hora_fin || "",
      };

      const isPendiente = !String(row.actividades_realizadas || "").trim();

      if (isPendiente) pendientes.push(item);
      else terminados.push(item);
    }

    return res.json({ ok: true, data: { pendientes, terminados } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error listando formularios" });
  }
});

/**
 * POST /api/formularios/pending
 * Crea el pendiente automáticamente cuando se reporta falla.
 */
router.post("/pending", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const idEquipo = Number(req.body?.id_equipo);
    if (!idEquipo) {
      return res.status(400).json({ ok: false, message: "Falta id_equipo" });
    }

    const fecha = trimOrNull(req.body?.fecha) || new Date().toISOString().slice(0, 10);
    const fallaReportada =
      trimOrNull(req.body?.falla_reportada) || "Falla reportada desde el módulo de reporte rápido";
    const observaciones = trimOrNull(req.body?.observaciones);

    const pool = await getPool();

    const eq = await pool
      .request()
      .input("id_equipo", sql.Int, idEquipo)
      .query(`
        SELECT TOP 1
          e.id_equipo,
          e.numero_inventario,
          e.nombre_equipo,
          a.nombre_area
        FROM dbo.equipos e
        LEFT JOIN dbo.areas_hospital a ON a.id_area = e.id_area
        WHERE e.id_equipo = @id_equipo
      `);

    const equipo = eq.recordset?.[0];
    if (!equipo) {
      return res.status(404).json({ ok: false, message: "El equipo no existe" });
    }

    // Evita duplicar pendiente del mismo equipo y fecha si todavía no se termina
    const dup = await pool
      .request()
      .input("id_equipo", sql.Int, idEquipo)
      .input("fecha", sql.Date, fecha)
      .query(`
        SELECT TOP 1 id_formulario
        FROM dbo.formularios_servicio
        WHERE id_equipo = @id_equipo
          AND CAST(fecha AS date) = @fecha
          AND NULLIF(LTRIM(RTRIM(ISNULL(actividades_realizadas, ''))), '') IS NULL
        ORDER BY id_formulario DESC
      `);

    if (dup.recordset?.[0]?.id_formulario) {
      return res.json({
        ok: true,
        data: {
          id_formulario: dup.recordset[0].id_formulario,
          duplicated: true,
        },
      });
    }

    const ins = await pool
      .request()
      .input("id_equipo", sql.Int, idEquipo)
      .input("area_servicio", sql.VarChar(100), trimOrNull(req.body?.area_servicio) || equipo.nombre_area || null)
      .input("fecha", sql.Date, fecha)
      .input("falla_reportada", sql.VarChar(sql.MAX), fallaReportada)
      .input("observaciones", sql.VarChar(sql.MAX), observaciones)
      .input("id_usuario", sql.Int, req.user?.id_usuario || null)
      .query(`
        INSERT INTO dbo.formularios_servicio
          (id_equipo, area_servicio, fecha, falla_reportada, observaciones, id_usuario)
        OUTPUT INSERTED.id_formulario
        VALUES
          (@id_equipo, @area_servicio, @fecha, @falla_reportada, @observaciones, @id_usuario)
      `);

    await crearNotificacion(pool, {
      tipo: "formularios",
      accion: "pendiente",
      mensaje: `Se generó pendiente de orden de servicio: ${equipo.numero_inventario} · ${equipo.nombre_equipo} (por ${req.user.nombre})`,
      id_usuario_origen: req.user.id_usuario,
      id_equipo: idEquipo,
    });

    return res.json({
      ok: true,
      data: {
        id_formulario: ins.recordset?.[0]?.id_formulario || null,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error creando formulario pendiente" });
  }
});

/**
 * PUT /api/formularios/:id
 * Completa o edita el formulario.
 * Nota: firma_url se usa temporalmente para guardar el nombre del técnico.
 */
router.put("/:id", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ ok: false, message: "Id de formulario inválido" });
    }

    const {
      area_servicio,
      fecha,
      falla_reportada,
      actividades_realizadas,
      refacciones_utilizadas,
      observaciones,
      tecnico,
    } = req.body || {};

    const pool = await getPool();

    const before = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT TOP 1 id_formulario, id_equipo
        FROM dbo.formularios_servicio
        WHERE id_formulario = @id
      `);

    const current = before.recordset?.[0];
    if (!current) {
      return res.status(404).json({ ok: false, message: "Formulario no encontrado" });
    }

    const upd = await pool
      .request()
      .input("id", sql.Int, id)
      .input("area_servicio", sql.VarChar(100), trimOrNull(area_servicio))
      .input("fecha", sql.Date, trimOrNull(fecha))
      .input("falla_reportada", sql.VarChar(sql.MAX), trimOrNull(falla_reportada))
      .input("actividades_realizadas", sql.VarChar(sql.MAX), trimOrNull(actividades_realizadas))
      .input("refacciones_utilizadas", sql.VarChar(sql.MAX), trimOrNull(refacciones_utilizadas))
      .input("observaciones", sql.VarChar(sql.MAX), trimOrNull(observaciones))
      .input("tecnico", sql.VarChar(255), trimOrNull(tecnico))
      .input("id_usuario", sql.Int, req.user?.id_usuario || null)
      .query(`
        UPDATE dbo.formularios_servicio
        SET
          area_servicio = COALESCE(@area_servicio, area_servicio),
          fecha = COALESCE(@fecha, fecha),
          falla_reportada = COALESCE(@falla_reportada, falla_reportada),
          actividades_realizadas = @actividades_realizadas,
          refacciones_utilizadas = @refacciones_utilizadas,
          observaciones = @observaciones,
          firma_url = @tecnico,
          id_usuario = COALESCE(@id_usuario, id_usuario),
          hora_inicio = CASE
            WHEN NULLIF(LTRIM(RTRIM(ISNULL(@actividades_realizadas, ''))), '') IS NOT NULL
                 AND hora_inicio IS NULL
            THEN CAST(GETDATE() AS time)
            ELSE hora_inicio
          END,
          hora_fin = CASE
            WHEN NULLIF(LTRIM(RTRIM(ISNULL(@actividades_realizadas, ''))), '') IS NOT NULL
            THEN CAST(GETDATE() AS time)
            ELSE hora_fin
          END
        WHERE id_formulario = @id;

        SELECT @@ROWCOUNT AS rowsAffected;
      `);

    const rowsAffected = upd.recordset?.[0]?.rowsAffected || 0;
    if (!rowsAffected) {
      return res.status(404).json({ ok: false, message: "No se pudo actualizar el formulario" });
    }

    await crearNotificacion(pool, {
      tipo: "formularios",
      accion: "actualizado",
      mensaje: `Se actualizó una orden de servicio (por ${req.user.nombre})`,
      id_usuario_origen: req.user.id_usuario,
      id_equipo: current.id_equipo,
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error actualizando formulario" });
  }
});

/**
 * DELETE /api/formularios/:id
 */
router.delete("/:id", requireAuth, allowRoles("jefe", "empleado"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ ok: false, message: "Id de formulario inválido" });
    }

    const pool = await getPool();

    const del = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        DELETE FROM dbo.formularios_servicio
        WHERE id_formulario = @id;

        SELECT @@ROWCOUNT AS rowsAffected;
      `);

    const rowsAffected = del.recordset?.[0]?.rowsAffected || 0;
    if (!rowsAffected) {
      return res.status(404).json({ ok: false, message: "Formulario no encontrado" });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Error eliminando formulario" });
  }
});

export default router;