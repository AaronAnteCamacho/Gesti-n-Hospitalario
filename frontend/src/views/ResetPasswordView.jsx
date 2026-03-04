import React, { useMemo, useState } from "react";
import { authReset } from "../services/api.js";

export default function ResetPasswordView({ onGoLogin }) {
  const token = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    return qs.get("token") || "";
  }, []);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setOk(false);

    if (!token) {
      setMsg("Token no encontrado. Abre el enlace desde tu correo otra vez.");
      return;
    }
    if (!password || password.length < 6) {
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const r = await authReset(token, password);
      setMsg(r?.message || "Contraseña actualizada. Ya puedes iniciar sesión.");
      setOk(true);
      setPassword("");
    } catch (err) {
      setMsg(err?.message || "No se pudo restablecer la contraseña.");
      setOk(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>Gestor Hospitalario</div>

        <h2 style={styles.title}>Restablecer contraseña</h2>
        <p style={styles.sub}>
          Escribe tu nueva contraseña para recuperar el acceso.
        </p>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            style={styles.input}
            disabled={loading}
          />

          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>

          <button
            type="button"
            style={styles.ghostBtn}
            onClick={onGoLogin}
            disabled={loading}
          >
            Volver al login
          </button>

          {!!msg && (
            <div
              style={{
                ...styles.msg,
                borderColor: ok ? "rgba(11,122,87,.35)" : "rgba(200,30,30,.35)",
                background: ok ? "rgba(11,122,87,.08)" : "rgba(200,30,30,.08)",
                color: ok ? "#0B7A57" : "#b91c1c",
              }}
            >
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "linear-gradient(135deg, #006341, #0B7A57)",
  },
  card: {
    width: "min(520px, 92vw)",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 20px 50px rgba(0,0,0,.20)",
    padding: 22,
  },
  badge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(11,122,87,.12)",
    color: "#0B7A57",
    marginBottom: 10,
  },
  title: { margin: "6px 0 4px", fontSize: 22 },
  sub: { margin: "0 0 14px", color: "#4b5563", fontSize: 13 },
  form: { display: "grid", gap: 10 },
  label: { fontSize: 12, fontWeight: 700, color: "#111827" },
  input: {
    width: "100%",
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "12px 12px",
    outline: "none",
  },
  primaryBtn: {
    border: 0,
    borderRadius: 12,
    padding: "12px 12px",
    background: "#006341",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  ghostBtn: {
    borderRadius: 12,
    padding: "12px 12px",
    background: "rgba(11,122,87,.08)",
    border: "1px solid rgba(11,122,87,.25)",
    color: "#0B7A57",
    fontWeight: 800,
    cursor: "pointer",
  },
  msg: {
    marginTop: 4,
    fontSize: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,.15)",
  },
};