import React, { useMemo, useState } from "react";
import "../styles/Home.css";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Home
 * - Búsqueda rápida por NÚMERO DE INVENTARIO, NOMBRE o NÚMERO DE SERIE.
 * - Si NO existe: botón para agregarlo a la BD y luego reportar falla.
 * - Si existe: botón para reportar falla (esto lo manda a Bitácoras y también a Pendientes).
 */
export default function Home({
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
    <section className="card home">
      <h2 className="home__title">Inicio</h2>

      <div className="small muted home__hint">
        Búsqueda rápida: escribe el <strong>NÚMERO DE INVENTARIO</strong>,{" "}
        <strong>NOMBRE</strong> o <strong>NÚMERO DE SERIE</strong>.
      </div>

      <div className="row home__searchRow">
        <input
          className="home__searchInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Inventario, nombre o serie (ej. 203965 / CAMA / 01N14001001)"
        />

        <button className="nav-btn" onClick={() => setQ("")}>
          Limpiar
        </button>
      </div>

      <div className="home__results">
        {q.trim() && !found ? (
          <div className="card">
            <div className="home__innerTitle">No se encontró el registro.</div>

            <div className="small muted home__innerText">
              Puedes agregar el equipo al inventario y enseguida registrar la
              falla en bitácora.
            </div>

            <div className="home__actions">
              <button className="btn" onClick={() => onQuickCreate?.(q.trim())}>
                Agregar equipo + Registrar falla
              </button>
            </div>
          </div>
        ) : null}

        {found ? (
          <div className="card">
            <div className="home__foundHeader">
              <div>
                <div className="home__foundName">
                  {found.nombre_equipo || "Equipo"}
                </div>

                <div className="small muted">
                  Inv: <strong>{found.numero_inventario || "—"}</strong> · Serie:{" "}
                  <strong>{found.numero_serie || "—"}</strong>
                </div>

                <div className="small muted home__foundMeta">
                  Área: {found.nombre_area || found.id_area || "—"} · Categoría:{" "}
                  {found.nombre_categoria || found.id_categoria || "—"}
                </div>
              </div>

              <div className="home__foundButtons">
                <button className="btn" onClick={() => onReportFalla?.(found)}>
                  Reportar falla
                </button>
                {typeof onGoForm === "function" && (
                  <button className="nav-btn" onClick={onGoForm}>
                    Ir a formularios
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="small muted home__footer">
        Bitácoras registradas: <strong>{(bitacoras || []).length}</strong>
      </div>
    </section>
  );
}