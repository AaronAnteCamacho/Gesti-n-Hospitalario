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
        `${it.numero_inventario || ""} ${it.nombre_equipo || ""} ${it.marca || ""} ${it.modelo || ""} ${it.usuario_correo || ""} ${it.motivo || ""}`
      ).includes(t)
    );
  }, [items, q]);

  async function restore(it) {
    if (!isJefe) return;
    if (!confirm(`¿Restaurar el equipo ${it.numero_inventario || it.id_equipo}?`)) return;
    try {
      setLoading(true);
      await apiFetch(`/api/papelera/${it.id_papelera}/restore`, { method: "POST" });
      await load();
      onRestored?.();
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Inventario, equipo, motivo, usuario..." />
        <div className="small muted" style={{ marginTop: 6 }}>
          {isJefe
            ? "Eres jefe: ves todo lo eliminado."
            : "Eres empleado: solo ves lo que tú eliminaste."}
        </div>
      </div>

      <div style={{ marginTop: 10, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID Papelera</th>
              <th>ID Equipo</th>
              <th>Inventario</th>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Motivo</th>
              <th>Borrado por</th>
              <th>Fecha</th>
              {isJefe && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id_papelera}>
                <td>{it.id_papelera}</td>
                <td>{it.id_equipo}</td>
                <td>{it.numero_inventario || "—"}</td>
                <td>{it.nombre_equipo || "—"}</td>
                <td>{it.marca || "—"}</td>
                <td>{it.modelo || "—"}</td>
                <td style={{ minWidth: 220 }}>{it.motivo}</td>
                <td>{it.usuario_correo || it.id_usuario}</td>
                <td>{it.fecha_borrado ? String(it.fecha_borrado).slice(0, 19).replace('T',' ') : "—"}</td>
                {isJefe && (
                  <td>
                    <button className="btn" onClick={() => restore(it)} disabled={loading}>
                      Restaurar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isJefe ? 10 : 9} className="muted">
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
