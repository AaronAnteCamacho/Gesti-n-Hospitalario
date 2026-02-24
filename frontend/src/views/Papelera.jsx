import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api.js";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function PapeleraView({ auth, onBack, onRestored }) {
  const isJefe = auth?.rol === "jefe";
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/api/papelera");
      setItems(r.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => alert(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const t = norm(q);
    if (!t) return items;
    return (items || []).filter((it) =>
      norm(
        `${it.id_equipo || ""} ${it.numero_inventario || ""} ${it.nombre_equipo || ""} ${it.marca || ""} ${it.modelo || ""} ${it.nombre_area || ""} ${it.nombre_categoria || ""}`
      ).includes(t)
    );
  }, [items, q]);

  async function restore(it) {
    if (!isJefe) return;
    if (!confirm(`¿Restaurar el equipo ${it.numero_inventario || it.id_equipo}?`)) return;

    try {
      setLoading(true);
      await apiFetch(`/api/papelera/${it.id_equipo}/restore`, { method: "POST" });
      await load();
      onRestored?.();
      alert("Equipo restaurado.");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeForever(it) {
    if (!isJefe) return;
    const label = it.numero_inventario || it.id_equipo;
    if (!confirm(`⚠️ Esto eliminará DEFINITIVAMENTE el equipo ${label}. ¿Continuar?`)) return;

    try {
      setLoading(true);
      await apiFetch(`/api/papelera/${it.id_equipo}`, { method: "DELETE" });
      await load();
      onRestored?.();
      alert("Equipo eliminado definitivamente.");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Papelera</h2>
        <button className="nav-btn" onClick={onBack}>Volver</button>
        <button className="btn" onClick={load} disabled={loading}>
          Recargar
        </button>
      </div>

      <div style={{ marginTop: 10 }} className="card">
        <label>Buscar</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Inventario, equipo, marca, modelo, área..."
        />
        <div className="small muted" style={{ marginTop: 6 }}>
          {isJefe
            ? "Eres jefe: puedes restaurar o eliminar definitivamente equipos."
            : "Eres empleado: solo puedes visualizar la papelera."}
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          Los elementos en papelera se eliminan automáticamente después de <b>30 días</b>.
        </div>
      </div>

      <div style={{ marginTop: 10, overflowX: "auto" }}>
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
                <td>{it.fecha_registro ? String(it.fecha_registro).slice(0, 19).replace("T", " ") : "—"}</td>
                <td>{it.fecha_borrado ? String(it.fecha_borrado).slice(0, 19).replace("T", " ") : "—"}</td>

                {isJefe && (
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
