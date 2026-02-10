import React, { useState } from "react";
import { apiFetch } from "../services/api.js";

export default function LoginView({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [correoRec, setCorreoRec] = useState("");
  const [recuperar, setRecuperar] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const r = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ correo, password }),
      });
      

      localStorage.setItem("auth", JSON.stringify({
        token: r.token,
        usuario: r.usuario, // {id_usuario,nombre,correo,rol,id_rol}
      }));

      onLogin?.();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRecover(e) {
    e.preventDefault();
    try {
      const r = await apiFetch("/api/auth/recover", {
        method: "POST",
        body: JSON.stringify({ correo: correoRec }),
      });
      alert(r.message);
      setRecuperar(false);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "80px auto" }}>
      <h2 style={{ textAlign: "center" }}>Gestor Hospitalario</h2>

      {!recuperar ? (
        <form onSubmit={handleLogin}>
          <label>Correo</label>
          <input value={correo} onChange={(e) => setCorreo(e.target.value)} />

          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button className="btn" style={{ width: "100%", marginTop: 12 }}>
            Ingresar
          </button>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button type="button" className="nav-btn" onClick={() => setRecuperar(true)}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRecover}>
          <label>Correo del trabajador</label>
          <input value={correoRec} onChange={(e) => setCorreoRec(e.target.value)} />

          <button className="btn" style={{ width: "100%", marginTop: 12 }}>
            Recuperar cuenta
          </button>

          <button
            type="button"
            className="nav-btn"
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => setRecuperar(false)}
          >
            Volver al login
          </button>
        </form>
      )}
    </div>
  );
}
