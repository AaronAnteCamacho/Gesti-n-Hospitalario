import React, { useState } from "react";
import "../styles/Bitacora.css";
import ExportPickerModal from "../components/ExportPickerModal.jsx";

export default function Bitacora({ bitacoras, onNew, onOpen, onDownload }) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState(null);

  function openExportModal(bitacora) {
    setExportTarget(bitacora || null);
    setExportOpen(true);
  }

  function closeExportModal() {
    setExportOpen(false);
    setExportTarget(null);
  }

  function handlePick(tipo) {
    if (!exportTarget) return;

    // Si tu onDownload(b) solo recibe 1 parámetro, NO se rompe:
    // JS ignora argumentos extra.
    onDownload?.(exportTarget, tipo);

    closeExportModal();
  }

  return (
    <section className="card bitacora">
      <div className="bitacora__header">
        <h2 className="bitacora__title">Bitácoras</h2>
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
                      <button className="nav-btn" onClick={() => onOpen?.(b)}>
                        Abrir
                      </button>

                      <button
                        className="nav-btn"
                        onClick={() => openExportModal(b)}
                      >
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

      <ExportPickerModal
      open={exportOpen}
      onClose={closeExportModal}
      title="Descargar bitácora"
        onPick={(tipo) => {
          if (!exportTarget) return;
          onDownload?.(exportTarget, tipo);
          closeExportModal();
        }}
      />
    </section>
  );
}