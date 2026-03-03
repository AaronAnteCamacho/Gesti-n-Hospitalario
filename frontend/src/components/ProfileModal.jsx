import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { apiFetch } from "../services/api.js";

function isValidEmail(v) {
  const s = String(v || "").trim();
  // correo simple y decente (sin espacios)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export default function ProfileModal({
  open,
  onClose,
  auth,
  onAuthUpdate,
  toast,
  ToastViewport,
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
    // ✅ NO dependas de auth.token, apiFetch toma el token de localStorage
    setMeLoading(true);
    try {
      const r = await apiFetch("/api/usuarios/me");
      const d = r.data || {};
      setMeNombre(d.nombre || "");
      setMeCorreo(d.correo || "");
      setMeRol(d.rol || auth?.rol || "");
      setMeNewPass("");
    } catch (e) {
      notify.error(e?.message || "No se pudo cargar el perfil");
    } finally {
      setMeLoading(false);
    }
  }

  async function saveMe(e) {
    e?.preventDefault?.();

    const nombre = meNombre.trim();
    const correo = meCorreo.trim();

    if (!nombre) return notify.error("El nombre es obligatorio.");
    if (!correo) return notify.error("El correo es obligatorio.");
    if (!isValidEmail(correo)) return notify.error("Correo inválido.");

    // ✅ contraseña opcional, pero si la escribe validamos mínimo
    if (meNewPass && meNewPass.length < 6) {
      return notify.error("La contraseña debe tener al menos 6 caracteres.");
    }

    setMeLoading(true);
    try {
      const r = await apiFetch("/api/usuarios/me", {
        method: "PUT",
        body: JSON.stringify({
          nombre,
          correo,
          ...(meNewPass ? { password: meNewPass } : {}),
          // ⚠️ NO mandamos rol
        }),
      });

      const updated = r?.data || null;

      // ✅ actualiza auth en memoria/localStorage (sin tocar token)
      const nextAuth = {
        ...(auth || {}),
        nombre: updated?.nombre ?? nombre,
        correo: updated?.correo ?? correo,
        rol: updated?.rol ?? (auth?.rol || meRol || ""),
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

  // ✅ cada vez que abras el modal, trae datos reales desde BD
  useEffect(() => {
    if (!open) return;
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} title="Editar perfil" onClose={onClose}>
      {open && ToastViewport ? <ToastViewport scope="modal" /> : null}

      <form onSubmit={saveMe}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label>Nombre</label>
            <input
              value={meNombre}
              onChange={(e) => setMeNombre(e.target.value)}
              placeholder="Tu nombre"
              disabled={meLoading}
            />
          </div>

          <div>
            <label>Correo</label>
            <input
              value={meCorreo}
              onChange={(e) => setMeCorreo(e.target.value)}
              placeholder="correo@..."
              disabled={meLoading}
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
              disabled={meLoading}
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
    </Modal>
  );
}