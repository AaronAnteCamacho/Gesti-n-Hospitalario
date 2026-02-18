import React, { useMemo, useRef, useState } from "react";
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

  // ✅ Toast interno (no depende de App.jsx)
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const pushToast = (type, message, title = "Notificación", duration = 2600) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = { id, type, title, message };
    setToasts((prev) => [toast, ...prev].slice(0, 5)); // máx 5

    // autoclose
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timersRef.current.delete(id);
    }, duration);

    timersRef.current.set(id, t);
  };

  const closeToast = (id) => {
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  };

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

    // ✅ Opción A: mantener "loading" activo hasta que cambies a Home
    pushToast("success", "Inicio de sesión exitoso.");

    setTimeout(() => {
      onLogin?.(); // aquí ya cambias a Home
    }, 1200);
  } catch (err) {
    pushToast("error", err?.message || "Credenciales inválidas");
    setLoading(false); // si falla, sí quitamos loading para que pueda intentar otra vez
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

      pushToast("success", r?.message || "Solicitud enviada.");
      setRecuperar(false);
      setCorreoRec("");
    } catch (err) {
      pushToast("error", err?.message || "No se pudo procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  const IMSS_GREEN = "#006341";
  const IMSS_GREEN_2 = "#0B7A57";

  return (
    <div style={styles.page(IMSS_GREEN, IMSS_GREEN_2)}>
      {/* ✅ Toasts flotantes (arriba derecha) */}
      <div className="toast-viewport top-right" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === "error" ? "alert" : "status"}>
            <div className="toast__bar" />
            <div className="toast__head">
              <div className="toast__title">{t.title}</div>
              <button className="toast__close" onClick={() => closeToast(t.id)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="toast__msg">{t.message}</div>
          </div>
        ))}
      </div>

      {/* ✅ estilos del toast (en este mismo archivo para que NO te falte nada) */}
      <style>{`
        .toast-viewport{
          position: fixed;
          z-index: 9999;
          width: min(360px, calc(100vw - 24px));
          display: grid;
          gap: 10px;
          padding: 12px;
          pointer-events: none;
        }
        .toast-viewport.top-right{ top: 10px; right: 10px; }
        .toast{
          pointer-events: auto;
          border-radius: 3px;
          background: #fff;
          box-shadow: 0 10px 26px rgba(0,0,0,.20);
          overflow: hidden;
          border: 1px solid rgba(0,0,0,.08);
          transform-origin: top right;
          animation: toastIn .12s ease-out;
        }
        @keyframes toastIn{
          from{ transform: translateY(-6px); opacity: 0; }
          to{ transform: translateY(0); opacity: 1; }
        }
        .toast__bar{ height: 10px; }
        .toast__head{
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px 2px;
          color: #fff;
        }
        .toast__title{ font-weight: 700; font-size: 12px; }
        .toast__msg{ padding: 6px 10px 10px; font-size: 12px; color: #2b2b2b; }
        .toast__close{
          border: 0; background: transparent; color: rgba(255,255,255,.9);
          font-size: 16px; cursor: pointer; line-height: 1;
        }
        .toast--success .toast__bar, .toast--success .toast__head{ background: #0b6b43; }
        .toast--error .toast__bar, .toast--error .toast__head{ background: #c81e1e; }
        .toast--info .toast__bar, .toast--info .toast__head{ background: #2563eb; }
      `}</style>

      {/* --- TU UI DEL LOGIN (igual que ya la traes) --- */}
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
