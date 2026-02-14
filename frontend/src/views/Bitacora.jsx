import React from "react";
import "../styles/Bitacora.css";

export default function Bitacora({ bitacoras, onNew, onOpen, onDownload }) {
  return (
    <section className="card bitacora">
      <div className="bitacora__header">
        <h2 className="bitacora__title">Bitácoras</h2>

        <div>
          <button className="btn" onClick={onNew}>
            Nueva bitácora
          </button>
        </div>
      </div>

      <div className="card bitacora__tableCard">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Nombre de bitácora</th>
              <th>Fecha creación</th>
              <th>Nº artículos</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {bitacoras?.length ? (
              bitacoras.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.nombre}</td>
                  <td>{b.fecha}</td>
                  <td>{b.items?.length || 0}</td>
                  <td>
                    <div className="bitacora__actions">
                      <button className="nav-btn" onClick={() => onOpen(b)}>
                        Abrir
                      </button>
                      <button className="nav-btn" onClick={() => onDownload(b)}>
                        Descargar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="small muted">
                  No hay bitácoras registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}