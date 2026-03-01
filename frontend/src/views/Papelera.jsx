import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api.js";
import "../styles/Papelera.css";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function PapeleraView({ auth, onBack, onRestored, toast }) {
  const isJefe = auth?.rol === "jefe";
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  // fallback si por alguna razón no llega toast
  const t = toast || {
    success: (m) => alert(m),
    error: (m) => alert(m),
    info: (m) => alert(m),
    confirm: async (m) => confirm(m),
  };

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/api/papelera");
      setItems(r.data || []);
    } catch (e) {
      t.error(e.message || "Error cargando papelera");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const x = norm(q);
    if (!x) return items;
    return (items || []).filter((it) =>
      norm(
        `${it.id_equipo || ""} ${it.numero_inventario || ""} ${it.nombre_equipo || ""} ${
          it.marca || ""
        } ${it.modelo || ""} ${it.nombre_area || ""} ${it.nombre_categoria || ""}`
      ).includes(x)
    );
  }, [items, q]);

  async function restore(it) {
    if (!isJefe) return;
    const label = it.numero_inventario || it.id_equipo;

    const ok = await t.confirm(`¿Restaurar el equipo ${label}?`, {
      title: "Confirmar restauración",
      okText: "Restaurar",
      cancelText: "Cancelar",
      okVariant: "primary",
    });
    if (!ok) return;

    try {
      setLoading(true);
      await apiFetch(`/api/papelera/${it.id_equipo}/restore`, { method: "POST" });
      await load();
      onRestored?.();
      t.success("Equipo restaurado.");
    } catch (e) {
      t.error(e.message || "Error al restaurar");
    } finally {
      setLoading(false);
    }
  }

  async function removeForever(it) {
    if (!isJefe) return;
    const label = it.numero_inventario || it.id_equipo;

    const ok = await t.confirm(
      `⚠️ Esto eliminará DEFINITIVAMENTE el equipo ${label}. ¿Continuar?`,
      {
        title: "Confirmar eliminación",
        okText: "Eliminar",
        cancelText: "Cancelar",
        okVariant: "danger", // ✅ ROJO
      }
    );
    if (!ok) return;

    try {
      setLoading(true);
      await apiFetch(`/api/papelera/${it.id_equipo}`, { method: "DELETE" });
      await load();
      onRestored?.();
      t.success("Equipo eliminado definitivamente.");
    } catch (e) {
      t.error(e.message || "Error al eliminar definitivamente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="papeleraHeader">
        <h2 className="papeleraTitle">Papelera</h2>

        <button className="nav-btn" onClick={onBack}>
          Volver
        </button>

        <button className="btn" onClick={load} disabled={loading}>
          Recargar
        </button>
      </div>

      <div className="card papeleraCardInner">
        <label>Buscar</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Inventario, equipo, marca, modelo, área..."
        />

        <div className="small muted papeleraInfo">
          {isJefe
            ? "Eres jefe: puedes restaurar o eliminar definitivamente equipos."
            : "Eres empleado: solo puedes visualizar la papelera."}
        </div>

        <div className="small muted papeleraInfo">
          Los elementos en papelera se eliminan automáticamente después de <b>30 días</b>.
        </div>
      </div>

      <div className="papeleraTableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Inventario</th>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Área</th>
              <th>Categoría</th>
              <th>Fecha registro</th>
              <th>Fecha borrado</th>
              {isJefe && <th>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {filtered.map((it) => (
              <tr key={it.id_equipo}>
                <td>{it.numero_inventario || "—"}</td>
                <td>{it.nombre_equipo || "—"}</td>
                <td>{it.marca || "—"}</td>
                <td>{it.modelo || "—"}</td>
                <td>{it.nombre_area || it.id_area || "—"}</td>
                <td>{it.nombre_categoria || it.id_categoria || "—"}</td>
                <td>
                  {it.fecha_registro
                    ? String(it.fecha_registro).slice(0, 19).replace("T", " ")
                    : "—"}
                </td>
                <td>
                  {it.fecha_borrado
                    ? String(it.fecha_borrado).slice(0, 19).replace("T", " ")
                    : "—"}
                </td>

                {isJefe && (
                  <td>
                    <div className="papeleraActions">
                      <button className="btn" onClick={() => restore(it)} disabled={loading}>
                        Restaurar
                      </button>
                      <button className="btn danger" onClick={() => removeForever(it)} disabled={loading}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={isJefe ? 9 : 8} className="muted">
                  {loading ? "Cargando..." : "No hay elementos en la papelera."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}