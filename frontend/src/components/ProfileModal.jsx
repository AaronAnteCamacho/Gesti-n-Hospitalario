import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { apiFetch } from "../services/api.js";

function isValidEmail(v) {
  return /.+@.+\..+/.test(String(v || "").trim());
}

export default function ProfileModal({
  open,
  onClose,
  auth,
  onAuthUpdate,
  toast,
  ToastViewport, // ✅ nuevo
}) {
  const [meLoading, setMeLoading] = useState(false);
  const [meNombre, setMeNombre] = useState("");
  const [meCorreo, setMeCorreo] = useState("");
  const [meRol, setMeRol] = useState("");
  const [meNewPass, setMeNewPass] = useState("");

  const notify = {
    success: (msg) => (toast?.success ? toast.success(msg) : alert(msg)),
    error: (msg) => (toast?.error ? toast.error(msg) : alert(msg)),
    info: (msg) => (toast?.info ? toast.info(msg) : alert(msg)),
  };

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

    if (!meNombre.trim()) return notify.error("El nombre es obligatorio.");
    if (!meCorreo.trim()) return notify.error("El correo es obligatorio.");
    if (!isValidEmail(meCorreo)) return notify.error("Correo inválido.");

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
      notify.success("Perfil actualizado.");
    } catch (err) {
      notify.error(err?.message || "No se pudo actualizar");
    } finally {
      setMeLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadMe().catch((e) => notify.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} title="Editar perfil" onClose={onClose}>
      {/* ✅ Toast dentro del modal */}
      {open && ToastViewport ? <ToastViewport scope="modal" /> : null}

      <form onSubmit={saveMe}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label>Nombre</label>
            <input value={meNombre} onChange={(e) => setMeNombre(e.target.value)} placeholder="Tu nombre" />
          </div>

          <div>
            <label>Correo</label>
            <input value={meCorreo} onChange={(e) => setMeCorreo(e.target.value)} placeholder="correo@..." />
          </div>

          <div>
            <label>Rol</label>
            <input value={meRol || auth?.rol || ""} disabled />
          </div>

          <div>
            <label>Nueva contraseña (opcional)</label>
            <input value={meNewPass} onChange={(e) => setMeNewPass(e.target.value)} type="password" placeholder="••••••" />
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
    </Modal>
  );
}