import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { apiFetch } from "../services/api.js";

function isValidEmail(v) {
  return /.+@.+\..+/.test(String(v || "").trim());
}

export default function UsersModal({
  open,
  onClose,
  auth,
  toast,
  ToastViewport, // ✅ nuevo
}) {
  const isJefe = auth?.rol === "jefe";

  const notify = {
    success: (msg) => (toast?.success ? toast.success(msg) : alert(msg)),
    error: (msg) => (toast?.error ? toast.error(msg) : alert(msg)),
    info: (msg) => (toast?.info ? toast.info(msg) : alert(msg)),
  };

  const [uLoading, setULoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [cNombre, setCNombre] = useState("");
  const [cCorreo, setCCorreo] = useState("");
  const [cPass, setCPass] = useState("");
  const [cRol, setCRol] = useState("empleado");

  const [editing, setEditing] = useState(null);
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
    if (!cNombre.trim()) return notify.error("El nombre es obligatorio.");
    if (!cCorreo.trim()) return notify.error("El correo es obligatorio.");
    if (!isValidEmail(cCorreo)) return notify.error("Correo inválido.");
    if (!cPass) return notify.error("La contraseña es obligatoria.");

    setULoading(true);
    try {
      const r = await apiFetch("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({ nombre: cNombre.trim(), correo: cCorreo.trim(), password: cPass, rol: cRol }),
      });

      const created = r?.data;
      if (created?.id_usuario) setUsuarios((prev) => [created, ...prev]);
      else await loadUsuarios();

      setCNombre(""); setCCorreo(""); setCPass(""); setCRol("empleado"); setShowCreate(false);
      notify.success("Usuario creado.");
    } catch (err) {
      notify.error(err?.message || "No se pudo crear");
    } finally {
      setULoading(false);
    }
  }

  async function saveEdit(e) {
    e?.preventDefault?.();
    if (!editing?.id_usuario) return;

    if (!eNombre.trim()) return notify.error("El nombre es obligatorio.");
    if (!eCorreo.trim()) return notify.error("El correo es obligatorio.");
    if (!isValidEmail(eCorreo)) return notify.error("Correo inválido.");

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
        setUsuarios((prev) => prev.map((u) => (u.id_usuario === updated.id_usuario ? updated : u)));
      } else {
        await loadUsuarios();
      }

      setEditing(null);
      setEPass("");
      notify.success("Usuario actualizado.");
    } catch (err) {
      notify.error(err?.message || "No se pudo actualizar");
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
      notify.success("Usuario eliminado.");
    } catch (err) {
      notify.error(err?.message || "No se pudo eliminar");
    } finally {
      setULoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (isJefe) loadUsuarios().catch((e) => notify.error(e.message));
    setShowCreate(false);
    setEditing(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} title="Usuarios" onClose={onClose}>
      {/* ✅ Toast dentro del modal */}
      {open && ToastViewport ? <ToastViewport scope="modal" /> : null}

      {!isJefe ? (
        <div>
          <div className="muted">No tienes permisos para administrar usuarios.</div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      ) : (
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
            <form onSubmit={saveEdit} style={{ marginTop: 14, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <strong>Editar usuario</strong>
                <div className="small muted" style={{ flex: 1 }}>{editing.correo}</div>
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
                <button type="submit" className="btn" disabled={uLoading}>Guardar cambios</button>
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
                  <tr><td colSpan={5} className="muted">No hay usuarios.</td></tr>
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