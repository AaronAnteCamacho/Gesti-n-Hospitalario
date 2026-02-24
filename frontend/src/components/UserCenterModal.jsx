import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { apiFetch } from "../services/api.js";

function isValidEmail(v) {
  return /.+@.+\..+/.test(String(v || "").trim());
}

// ✅ startTab agregado
export default function UserCenterModal({ open, onClose, auth, onAuthUpdate, startTab = "me" }) {
  const isJefe = auth?.rol === "jefe";

  const [tab, setTab] = useState("me"); // me | users

  // ===== MI PERFIL =====
  const [meLoading, setMeLoading] = useState(false);
  const [meNombre, setMeNombre] = useState("");
  const [meCorreo, setMeCorreo] = useState("");
  const [meRol, setMeRol] = useState("");
  const [meNewPass, setMeNewPass] = useState("");

  async function loadMe() {
    if (!auth?.token) return;
    setMeLoading(true);
    try {
      const r = await apiFetch("/api/usuarios/me");
      const d = r.data || {};
      setMeNombre(d.nombre || "");
      setMeCorreo(d.correo || "");
      setMeRol(d.rol || auth?.rol || "");
      setMeNewPass("");
    } finally {
      setMeLoading(false);
    }
  }

  async function saveMe(e) {
    e?.preventDefault?.();
    if (!meNombre.trim()) return alert("Falta nombre");
    if (!meCorreo.trim()) return alert("Falta correo");
    if (!isValidEmail(meCorreo)) return alert("Correo inválido");

    setMeLoading(true);
    try {
      const r = await apiFetch("/api/usuarios/me", {
        method: "PUT",
        body: JSON.stringify({
          nombre: meNombre.trim(),
          correo: meCorreo.trim(),
          ...(meNewPass ? { password: meNewPass } : {}),
        }),
      });

      const updated = r?.data || null;

      const nextAuth = {
        ...(auth || {}),
        nombre: updated?.nombre ?? meNombre.trim(),
        correo: updated?.correo ?? meCorreo.trim(),
      };
      try {
        localStorage.setItem("auth", JSON.stringify(nextAuth));
      } catch {}
      onAuthUpdate?.(nextAuth);

      setMeNewPass("");
      alert("Perfil actualizado.");
    } catch (err) {
      alert(err?.message || "No se pudo actualizar");
    } finally {
      setMeLoading(false);
    }
  }

  // ===== USUARIOS (JEFE) =====
  const [uLoading, setULoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [cNombre, setCNombre] = useState("");
  const [cCorreo, setCCorreo] = useState("");
  const [cPass, setCPass] = useState("");
  const [cRol, setCRol] = useState("empleado");

  const [editing, setEditing] = useState(null); // usuario
  const [eNombre, setENombre] = useState("");
  const [eCorreo, setECorreo] = useState("");
  const [eRol, setERol] = useState("empleado");
  const [eActivo, setEActivo] = useState(true);
  const [ePass, setEPass] = useState("");

  async function loadUsuarios() {
    if (!isJefe) return;
    setULoading(true);
    try {
      const r = await apiFetch("/api/usuarios");
      setUsuarios(r.data || []);
    } finally {
      setULoading(false);
    }
  }

  function startEdit(u) {
    setEditing(u);
    setENombre(u?.nombre || "");
    setECorreo(u?.correo || "");
    setERol(u?.rol || "empleado");
    setEActivo(Boolean(u?.activo));
    setEPass("");
  }

  async function createUser(e) {
    e?.preventDefault?.();
    if (!cNombre.trim()) return alert("Falta nombre");
    if (!cCorreo.trim()) return alert("Falta correo");
    if (!isValidEmail(cCorreo)) return alert("Correo inválido");
    if (!cPass) return alert("Falta contraseña");

    setULoading(true);
    try {
      const r = await apiFetch("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nombre: cNombre.trim(),
          correo: cCorreo.trim(),
          password: cPass,
          rol: cRol,
        }),
      });

      const created = r?.data;
      if (created?.id_usuario) {
        setUsuarios((prev) => [created, ...prev]);
      } else {
        await loadUsuarios();
      }

      setCNombre("");
      setCCorreo("");
      setCPass("");
      setCRol("empleado");
      setShowCreate(false);
      alert("Usuario creado.");
    } catch (err) {
      alert(err?.message || "No se pudo crear");
    } finally {
      setULoading(false);
    }
  }

  async function saveEdit(e) {
    e?.preventDefault?.();
    if (!editing?.id_usuario) return;
    if (!eNombre.trim()) return alert("Falta nombre");
    if (!eCorreo.trim()) return alert("Falta correo");
    if (!isValidEmail(eCorreo)) return alert("Correo inválido");

    setULoading(true);
    try {
      const r = await apiFetch(`/api/usuarios/${editing.id_usuario}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: eNombre.trim(),
          correo: eCorreo.trim(),
          rol: eRol,
          activo: eActivo,
          ...(ePass ? { password: ePass } : {}),
        }),
      });

      const updated = r?.data;
      if (updated?.id_usuario) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id_usuario === updated.id_usuario ? updated : u))
        );
      } else {
        await loadUsuarios();
      }

      setEditing(null);
      setEPass("");
      alert("Usuario actualizado.");
    } catch (err) {
      alert(err?.message || "No se pudo actualizar");
    } finally {
      setULoading(false);
    }
  }

  async function deleteUser(u) {
    const ok = confirm(`¿Seguro que quieres eliminar a "${u?.nombre}" (${u?.correo})?`);
    if (!ok) return;
    setULoading(true);
    try {
      await apiFetch(`/api/usuarios/${u.id_usuario}`, { method: "DELETE" });
      setUsuarios((prev) => prev.filter((x) => x.id_usuario !== u.id_usuario));
      alert("Usuario eliminado.");
    } catch (err) {
      alert(err?.message || "No se pudo eliminar");
    } finally {
      setULoading(false);
    }
  }

  // ✅ Cargar info al abrir + abrir tab correcto
  useEffect(() => {
    if (!open) return;

    // si piden "users" pero no es jefe, cae a "me"
    const nextTab = (startTab === "users" && isJefe) ? "users" : "me";
    setTab(nextTab);

    loadMe().catch((e) => alert(e.message));
    if (isJefe) loadUsuarios().catch((e) => alert(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startTab, isJefe]);

  const title = useMemo(() => {
    if (isJefe) return "Centro de usuario (Jefe)";
    return "Mi perfil";
  }, [isJefe]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          className={tab === "me" ? "btn" : "nav-btn"}
          type="button"
          onClick={() => setTab("me")}
        >
          Mi perfil
        </button>

        {isJefe && (
          <button
            className={tab === "users" ? "btn" : "nav-btn"}
            type="button"
            onClick={() => setTab("users")}
          >
            Usuarios
          </button>
        )}
      </div>

      {/* Mi perfil */}
      {tab === "me" && (
        <form onSubmit={saveMe}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label>Nombre</label>
              <input
                value={meNombre}
                onChange={(e) => setMeNombre(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label>Correo</label>
              <input
                value={meCorreo}
                onChange={(e) => setMeCorreo(e.target.value)}
                placeholder="correo@..."
              />
            </div>
            <div>
              <label>Rol</label>
              <input value={meRol || auth?.rol || ""} disabled />
            </div>
            <div>
              <label>Nueva contraseña (opcional)</label>
              <input
                value={meNewPass}
                onChange={(e) => setMeNewPass(e.target.value)}
                type="password"
                placeholder="••••••"
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="nav-btn" onClick={onClose} disabled={meLoading}>
              Cerrar
            </button>
            <button type="submit" className="btn" disabled={meLoading}>
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Usuarios */}
      {tab === "users" && isJefe && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="small muted" style={{ flex: 1 }}>
              {uLoading ? "Cargando..." : `${usuarios.length} usuario(s)`}
            </div>

            <button className="nav-btn" type="button" onClick={() => loadUsuarios()} disabled={uLoading}>
              Recargar
            </button>

            <button className="btn" type="button" onClick={() => setShowCreate((v) => !v)} disabled={uLoading}>
              {showCreate ? "Cerrar" : "Agregar usuario"}
            </button>
          </div>

          {showCreate && (
            <form onSubmit={createUser} style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label>Nombre</label>
                  <input value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="Nombre completo" />
                </div>
                <div>
                  <label>Correo</label>
                  <input value={cCorreo} onChange={(e) => setCCorreo(e.target.value)} placeholder="correo@hospital.local" />
                </div>
                <div>
                  <label>Contraseña</label>
                  <input value={cPass} onChange={(e) => setCPass(e.target.value)} type="password" placeholder="••••••" />
                </div>
                <div>
                  <label>Rol</label>
                  <select value={cRol} onChange={(e) => setCRol(e.target.value)}>
                    <option value="empleado">empleado</option>
                    <option value="jefe">jefe</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="nav-btn" onClick={() => setShowCreate(false)} disabled={uLoading}>
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={uLoading}>
                  Crear
                </button>
              </div>
            </form>
          )}

          {editing && (
            <form
              onSubmit={saveEdit}
              style={{ marginTop: 14, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <strong>Editar usuario</strong>
                <div className="small muted" style={{ flex: 1 }}>
                  {editing.correo}
                </div>
                <button type="button" className="nav-btn" onClick={() => setEditing(null)} disabled={uLoading}>
                  Cerrar edición
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label>Nombre</label>
                  <input value={eNombre} onChange={(e) => setENombre(e.target.value)} />
                </div>
                <div>
                  <label>Correo</label>
                  <input value={eCorreo} onChange={(e) => setECorreo(e.target.value)} />
                </div>
                <div>
                  <label>Rol</label>
                  <select value={eRol} onChange={(e) => setERol(e.target.value)}>
                    <option value="empleado">empleado</option>
                    <option value="jefe">jefe</option>
                  </select>
                </div>
                <div>
                  <label>Activo</label>
                  <select value={eActivo ? "1" : "0"} onChange={(e) => setEActivo(e.target.value === "1")}>
                    <option value="1">Sí</option>
                    <option value="0">No</option>
                  </select>
                </div>
                <div>
                  <label>Nueva contraseña (opcional)</label>
                  <input value={ePass} onChange={(e) => setEPass(e.target.value)} type="password" placeholder="••••••" />
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="submit" className="btn" disabled={uLoading}>
                  Guardar cambios
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Activo</th>
                  <th style={{ width: 220 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id_usuario}>
                    <td>{u.nombre}</td>
                    <td>{u.correo}</td>
                    <td>{u.rol || "—"}</td>
                    <td>{u.activo ? "Sí" : "No"}</td>
                    <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="nav-btn" type="button" onClick={() => startEdit(u)} disabled={uLoading}>
                        Editar
                      </button>
                      <button className="danger" type="button" onClick={() => deleteUser(u)} disabled={uLoading}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}

                {usuarios.length === 0 && !uLoading && (
                  <tr>
                    <td colSpan={5} className="muted">
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
      )}
    </Modal>
  );
}