import React, { useEffect, useMemo, useState } from "react";

/**
 * PerfilUsuariosView
 * - Intenta conectar a backend: GET/POST/DELETE /api/usuarios
 * - Si falla, usa localStorage como fallback (para no romper tu app).
 */

// Ajusta si tu backend corre en otro puerto/dominio
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function getAuth() {
  return safeParse(localStorage.getItem("auth"), null);
}

function getLocalUsuarios() {
  return safeParse(localStorage.getItem("usuarios"), []);
}

function setLocalUsuarios(list) {
  localStorage.setItem("usuarios", JSON.stringify(list));
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Error ${res.status}`);
  }
  // Si el backend responde vacío en DELETE, evitamos romper
  const text = await res.text();
  return text ? JSON.parse(text) : { ok: true };
}

export default function PerfilUsuariosView() {
  const auth = useMemo(() => getAuth(), []);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  // UI estado
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  // Form
  const [form, setForm] = useState({
    nombre_completo: "",
    clave: "",
    correo: "",
    rol: "usuario", // "jefe" | "usuario"
  });

  const usuariosFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return usuarios;
    return usuarios.filter((u) => {
      const nombre = String(u.nombre_completo || "").toLowerCase();
      const correo = String(u.correo || "").toLowerCase();
      const rol = String(u.rol || "").toLowerCase();
      return nombre.includes(term) || correo.includes(term) || rol.includes(term);
    });
  }, [q, usuarios]);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  function validarForm() {
    if (!form.nombre_completo.trim()) return "Falta el nombre completo";
    if (!form.clave.trim()) return "Falta la clave";
    if (!form.correo.trim()) return "Falta el correo";
    if (!form.correo.includes("@")) return "Correo inválido";
    if (!["jefe", "usuario"].includes(form.rol)) return "Rol inválido";
    return null;
  }

  async function cargarUsuarios() {
    setLoading(true);
    try {
      // 1) Intentar backend
      const data = await apiRequest("/api/usuarios", { method: "GET" });

      // Esperamos array
      const list = Array.isArray(data) ? data : (data?.recordset || []);
      setUsuarios(list);

      // Guardar también en local para fallback
      setLocalUsuarios(list);
    } catch (e) {
      // 2) Fallback localStorage
      const local = getLocalUsuarios();
      setUsuarios(local);
    } finally {
      setLoading(false);
    }
  }

  async function agregarUsuario(e) {
    e.preventDefault();

    const err = validarForm();
    if (err) return alert(err);

    const payload = {
      nombre_completo: form.nombre_completo.trim(),
      clave: form.clave.trim(),
      correo: form.correo.trim(),
      rol: form.rol,
    };

    try {
      // 1) Intentar backend
      await apiRequest("/api/usuarios", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Recargar desde backend
      await cargarUsuarios();

      // Reset form
      setForm({ nombre_completo: "", clave: "", correo: "", rol: "usuario" });
      setShowForm(false);
      alert("Usuario agregado.");
    } catch (e) {
      // 2) Fallback localStorage
      const current = getLocalUsuarios();

      // Evitar duplicado por correo o clave (ajústalo si tú quieres)
      const correoDup = current.some((u) => String(u.correo).toLowerCase() === payload.correo.toLowerCase());
      if (correoDup) return alert("Ya existe un usuario con ese correo.");

      const nuevo = {
        id_usuario: Date.now(), // id local
        ...payload,
      };

      const next = [nuevo, ...current];
      setLocalUsuarios(next);
      setUsuarios(next);

      setForm({ nombre_completo: "", clave: "", correo: "", rol: "usuario" });
      setShowForm(false);
      alert("Usuario agregado (modo local).");
    }
  }

  async function eliminarUsuario(u) {
    const id = u.id_usuario ?? u.id ?? u.ID ?? null;
    if (!id) return alert("No se pudo identificar el ID del usuario.");

    if (!confirm(`¿Eliminar a "${u.nombre_completo}"?`)) return;

    try {
      // 1) Intentar backend
      await apiRequest(`/api/usuarios/${id}`, { method: "DELETE" });
      await cargarUsuarios();
      alert("Usuario eliminado.");
    } catch (e) {
      // 2) Fallback localStorage
      const current = getLocalUsuarios();
      const next = current.filter((x) => (x.id_usuario ?? x.id) !== id);
      setLocalUsuarios(next);
      setUsuarios(next);
      alert("Usuario eliminado (modo local).");
    }
  }

  useEffect(() => {
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Perfil y usuarios</h2>
          <div className="small muted">Administra usuarios con rol jefe / usuario</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            <i className="fa-solid fa-user-plus" style={{ marginRight: 8 }}></i>
            {showForm ? "Cerrar" : "Agregar usuario"}
          </button>
        </div>
      </div>

      <hr style={{ margin: "12px 0", opacity: 0.2 }} />

      {/* PERFIL ACTUAL */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <i className="fa-solid fa-user-circle fa-2xl"></i>
          <div>
            <div style={{ fontWeight: 700 }}>
              {auth?.nombre || auth?.name || auth?.usuario || "Usuario"}
            </div>
            <div className="small muted">{auth?.correo || auth?.email || "—"}</div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <span className="pill">
              {(auth?.rol || auth?.role || "usuario").toString()}
            </span>
          </div>
        </div>
      </div>

      {/* FORMULARIO AGREGAR */}
      {showForm && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>Nuevo usuario</h3>

          <form onSubmit={agregarUsuario}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label>Nombre completo</label>
                <input
                  value={form.nombre_completo}
                  onChange={setField("nombre_completo")}
                  placeholder="Ej. Adolfo Ramírez García"
                />
              </div>

              <div>
                <label>Clave</label>
                <input
                  value={form.clave}
                  onChange={setField("clave")}
                  placeholder="Ej. AR123"
                />
              </div>

              <div>
                <label>Correo</label>
                <input
                  value={form.correo}
                  onChange={setField("correo")}
                  placeholder="correo@dominio.com"
                />
              </div>

              <div>
                <label>Rol</label>
                <select value={form.rol} onChange={setField("rol")}>
                  <option value="usuario">usuario</option>
                  <option value="jefe">jefe</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="nav-btn" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BUSCADOR */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          style={{ flex: 1 }}
          placeholder="Buscar por nombre, correo o rol…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="nav-btn" onClick={cargarUsuarios} disabled={loading}>
          <i className="fa-solid fa-rotate-right" style={{ marginRight: 8 }}></i>
          {loading ? "Cargando…" : "Recargar"}
        </button>
      </div>

      {/* TABLA USUARIOS */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <strong>Usuarios</strong>
          <span className="small muted" style={{ marginLeft: 10 }}>
            ({usuariosFiltrados.length})
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Clave</th>
                <th>Rol</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id_usuario ?? u.id ?? `${u.correo}-${u.clave}`}>
                  <td>{u.nombre_completo}</td>
                  <td>{u.correo}</td>
                  <td>{u.clave}</td>
                  <td>
                    <span className="pill">{u.rol}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      className="icon-btn"
                      title="Eliminar"
                      onClick={() => eliminarUsuario(u)}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="small muted">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="small muted" style={{ marginTop: 10 }}>
          Nota: si tu backend aún no tiene <code>/api/usuarios</code>, esto funciona con localStorage sin fallar.
        </div>
      </div>
    </div>
  );
}
