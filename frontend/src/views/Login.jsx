import React, { useMemo, useState } from "react";
import { apiFetch } from "../services/api.js";

import imssLogo from "../assets/imss_icon_64.png";
import PasswordToggleIconButton from "../components/PasswordToggleIconButton.jsx";

import "../styles/Login.css";

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [correoRec, setCorreoRec] = useState("");
  const [recuperar, setRecuperar] = useState(false);

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (recuperar ? "Recuperar acceso" : "Iniciar sesión"),
    [recuperar]
  );

  const subtitle = useMemo(
    () =>
      recuperar
        ? "Ingresa tu correo institucional para solicitar recuperación."
        : "Acceso al Gestor Hospitalitario de Inventario y Mantenimiento.",
    [recuperar]
  );

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ correo, password }),
      });

      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: r.token,
          usuario: r.usuario,
        })
      );

      onLogin?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await apiFetch("/api/auth/recover", {
        method: "POST",
        body: JSON.stringify({ correo: correoRec }),
      });

      alert(r.message);
      setRecuperar(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const IMSS_GREEN = "#006341";
  const IMSS_GREEN_2 = "#0B7A57";

  return (
    <div style={styles.page(IMSS_GREEN, IMSS_GREEN_2)}>
      <div className="imss-shell">
        <aside className="imss-aside">
          <div className="imss-brand">
            <div className="imss-logo-box">
              <img src={imssLogo} alt="IMSS" className="imss-logo" />
            </div>

            <div>
              <div className="imss-brand-title">
                Instituto Mexicano del Seguro Social
              </div>
              <div className="imss-brand-sub">Gestor Hospitalario</div>
            </div>
          </div>

          <div className="imss-aside-card">
            <div className="imss-aside-badge">Acceso seguro</div>
            <h3 className="imss-aside-title">
              Inventario • Bitácoras • Servicios
            </h3>
            <p className="imss-aside-text">
              Administra equipos, registra bitácoras de mantenimiento y genera
              formularios de servicio con control por usuario y rol.
            </p>

            <ul className="imss-aside-list">
              <li>✔ Sesiones con token</li>
              <li>✔ Roles: jefe / empleado</li>
              <li>✔ Registro y consulta de inventario</li>
            </ul>
          </div>

          <div className="imss-aside-footer">
            © {new Date().getFullYear()} • IMSS • Uso interno
          </div>
        </aside>

        <main className="imss-card" role="main" aria-label="Acceso">
          <div className="imss-card-header">
            <div className="imss-pill">Gestor Hospitalario</div>
            <h2 className="imss-title">{title}</h2>
            <p className="imss-subtitle">{subtitle}</p>
          </div>

          {!recuperar ? (
            <form onSubmit={handleLogin} className="imss-form">
              <div className="imss-field">
                <label className="imss-label" htmlFor="correo">
                  Correo
                </label>
                <input
                  id="correo"
                  className="imss-input"
                  placeholder="ej. jefe.mantenimiento@hospital.local"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="username"
                  inputMode="email"
                  required
                />
              </div>

              <div className="imss-field">
                <label className="imss-label" htmlFor="password">
                  Contraseña
                </label>

                <div className="imss-pass-wrap">
                  <input
                    id="password"
                    className="imss-input imss-input-pass"
                    type={showPass ? "text" : "password"}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <PasswordToggleIconButton
                    pressed={showPass}
                    onClick={() => setShowPass((v) => !v)}
                  />
                </div>
              </div>

              <button className="imss-btn" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              <div className="imss-row">
                <button
                  type="button"
                  className="imss-link"
                  onClick={() => setRecuperar(true)}
                  disabled={loading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="imss-hint">
                Tip: si es la primera vez, confirma que tu usuario tenga un{" "}
                <b>password_hash válido</b> en la BD.
              </div>
            </form>
          ) : (
            <form onSubmit={handleRecover} className="imss-form">
              <div className="imss-field">
                <label className="imss-label" htmlFor="correoRec">
                  Correo del trabajador
                </label>
                <input
                  id="correoRec"
                  className="imss-input"
                  placeholder="ej. empleado.biomedico@hospital.local"
                  value={correoRec}
                  onChange={(e) => setCorreoRec(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <button className="imss-btn" disabled={loading}>
                {loading ? "Enviando..." : "Solicitar recuperación"}
              </button>

              <button
                type="button"
                className="imss-btn-secondary"
                onClick={() => setRecuperar(false)}
                disabled={loading}
              >
                Volver al login
              </button>

              <div className="imss-hint">
                Si aún no implementas envío real por correo, este endpoint puede
                responder solo con un mensaje demo.
              </div>
            </form>
          )}

          <div className="imss-card-footer">
            <span className="imss-dot" />
            Conexión segura a sistema interno
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  page: (g1, g2) => ({
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: `radial-gradient(1000px 600px at 15% 25%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.0) 70%),
                 linear-gradient(135deg, ${g1} 0%, ${g2} 45%, #0e2f27 100%)`,
  }),
};