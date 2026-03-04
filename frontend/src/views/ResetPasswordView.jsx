import React, { useMemo, useState } from "react";
import { authReset } from "../services/api.js";
import "../styles/ResetPasswordView.css";

export default function ResetPasswordView({ onGoLogin, toast }) {
  // fallback si no llega toast (igual que en otras vistas)
  const t = toast || {
    success: (m) => alert(m),
    error: (m) => alert(m),
    info: (m) => alert(m),
    confirm: async (m) => confirm(m),
  };

  const token = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    return qs.get("token") || "";
  }, []);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    if (!token) {
      t.error("Token no encontrado. Abre el enlace desde tu correo otra vez.");
      return;
    }
    if (!password || password.length < 6) {
      t.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const r = await authReset(token, password);
      t.success(r?.message || "Contraseña actualizada. Ya puedes iniciar sesión.");
      setPassword("");
    } catch (err) {
      t.error(err?.message || "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rp-page">
      <div className="rp-card">
        <div className="rp-badge">Gestor Hospitalario</div>

        <h2 className="rp-title">Restablecer contraseña</h2>
        <p className="rp-sub">Escribe tu nueva contraseña para recuperar el acceso.</p>

        <form onSubmit={onSubmit} className="rp-form">
          <label className="rp-label">Nueva contraseña</label>

          <input
            className="rp-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            disabled={loading}
          />

          <button className="rp-primaryBtn" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>

          <button className="rp-ghostBtn" type="button" onClick={onGoLogin} disabled={loading}>
            Volver al login
          </button>
        </form>
      </div>
    </div>
  );
}