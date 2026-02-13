import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api.js";

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem("auth") || "null");
  } catch {
    return null;
  }
}

export default function PerfilUsuariosView() {
  const auth = useMemo(() => getAuth(), []);
  const isJefe = auth?.rol === "jefe";

  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("empleado");

  async function loadUsuarios() {
    setLoading(true);
    try {
      const r = await apiFetch("/api/usuarios");
      setUsuarios(r.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isJefe) return;
    loadUsuarios().catch((e) => alert(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (!nombre.trim()) return alert("Falta nombre");
    if (!correo.trim()) return alert("Falta correo");
    if (!password) return alert("Falta contraseña");

    try {
      setLoading(true);
      await apiFetch("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: correo.trim(),
          password,
          rol,
        }),
      });

      setNombre("");
      setCorreo("");
      setPassword("");
      setRol("empleado");
      setShowForm(false);
      await loadUsuarios();
      alert("Usuario creado.");
    } catch (e2) {
      alert(e2.message);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(u) {
    const ok = confirm(`¿Seguro que quieres eliminar a "${u.nombre}" (${u.correo})?`);
    if (!ok) return;

    try {
      setLoading(true);
      await apiFetch(`/api/usuarios/${u.id_usuario}`, { method: "DELETE" });
      await loadUsuarios();
      alert("Usuario eliminado.");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!auth?.token) {
    return (
      <div className="card">
        <h2>Usuarios</h2>
        <p>No hay sesión activa.</p>
      </div>
    );
  }

  if (!isJefe) {
    return (
      <div className="card">
        <h2>Usuarios</h2>
        <p>
          No tienes permisos para acceder a esta sección. (Solo el rol <strong>jefe</strong>)
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Usuarios</h2>

        <button className="btn" onClick={() => setShowForm((v) => !v)} disabled={loading}>
          {showForm ? "Cerrar" : "Agregar usuario"}
        </button>

        <button className="nav-btn" onClick={() => loadUsuarios()} disabled={loading}>
          Recargar
        </button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label>Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label>Correo</label>
              <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@hospital.local" />
            </div>
            <div>
              <label>Contraseña</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••" />
            </div>
            <div>
              <label>Rol</label>
              <select value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="empleado">empleado</option>
                <option value="jefe">jefe</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="nav-btn" onClick={() => setShowForm(false)} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={loading}>
              Crear
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: 14 }} className="small muted">
        {loading ? "Cargando..." : `${usuarios.length} usuario(s)`}
      </div>

      <div style={{ marginTop: 10, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Activo</th>
              <th>Fecha creación</th>
              <th style={{ width: 140 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id_usuario}>
                <td>{u.id_usuario}</td>
                <td>{u.nombre}</td>
                <td>{u.correo}</td>
                <td>{u.rol || "—"}</td>
                <td>{u.activo ? "Sí" : "No"}</td>
                <td>{u.fecha_creacion ? String(u.fecha_creacion).slice(0, 10) : "—"}</td>
                <td>
                  <button className="danger" onClick={() => onDelete(u)} disabled={loading}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {usuarios.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="muted">
                  No hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="small muted" style={{ marginTop: 10 }}>
        Nota: las contraseñas no se muestran; el backend las guarda como hash.
      </div>
    </div>
  );
}
