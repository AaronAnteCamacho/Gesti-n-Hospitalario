import React, { useMemo, useState } from "react";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * HomeView
 * - Búsqueda rápida por NÚMERO DE INVENTARIO, NOMBRE o NÚMERO DE SERIE.
 * - Si NO existe: botón para agregarlo a la BD y luego reportar falla.
 * - Si existe: botón para reportar falla (esto lo manda a Bitácoras y también a Pendientes).
 */
export default function HomeView({
  inventario,
  bitacoras,
  onGoForm,
  onReportFalla,
  onQuickCreate,
}) {
  const [q, setQ] = useState("");

  const found = useMemo(() => {
    const s = norm(q);
    if (!s) return null;
    return (
      (inventario || []).find((it) => norm(it.numero_inventario) === s) ||
      (inventario || []).find((it) => norm(it.numero_serie) === s) ||
      (inventario || []).find((it) => norm(it.nombre_equipo).includes(s)) ||
      null
    );
  }, [inventario, q]);

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Inicio</h2>
      <div className="small muted" style={{ marginBottom: 10 }}>
        Búsqueda rápida: escribe el <strong>NÚMERO DE INVENTARIO</strong>, <strong>NOMBRE</strong> o <strong>NÚMERO DE SERIE</strong>.
      </div>

      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Inventario, nombre o serie (ej. 203965 / CAMA / 01N14001001)"
          style={{ flex: 1 }}
        />

        <button className="nav-btn" onClick={() => setQ("")}> 
          Limpiar
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {q.trim() && !found ? (
          <div className="card">
            <div style={{ fontWeight: 700 }}>No se encontró el registro.</div>
            <div className="small muted" style={{ marginTop: 6 }}>
              Puedes agregar el equipo al inventario y enseguida registrar la falla en bitácora.
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn"
                onClick={() => onQuickCreate?.(q.trim())}
              >
                Agregar equipo + Registrar falla
              </button>
            </div>
          </div>
        ) : null}

        {found ? (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>
                  {found.nombre_equipo || "Equipo"}
                </div>
                <div className="small muted">
                  Inv: <strong>{found.numero_inventario || "—"}</strong> · Serie: <strong>{found.numero_serie || "—"}</strong>
                </div>
                <div className="small muted" style={{ marginTop: 6 }}>
                  Área: {found.nombre_area || found.id_area || "—"} · Categoría: {found.nombre_categoria || found.id_categoria || "—"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => onReportFalla?.(found)}>
                  Reportar falla
                </button>
                <button className="nav-btn" onClick={onGoForm}>
                  Ir a formularios
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14 }} className="small muted">
        Bitácoras registradas: <strong>{(bitacoras || []).length}</strong>
      </div>
    </section>
  );
}
