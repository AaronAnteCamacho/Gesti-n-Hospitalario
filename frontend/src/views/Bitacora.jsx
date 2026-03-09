import React, { useRef, useState } from "react";
import "../styles/Bitacora.css";
import "../styles/TableScrollHint.css";
import ExportPickerModal from "../components/ExportPickerModal.jsx";
import TableScrollHint from "../components/TableScrollHint.jsx";

export default function Bitacora({ bitacoras, onNew, onOpen, onDownload }) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState(null);
  const tableWrapRef = useRef(null);

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

      <TableScrollHint
        targetRef={tableWrapRef}
        className="tableScrollHint bitacora__scrollHint"
        text="Desliza para ver más columnas"
        sticky
      />

      <div className="card bitacora__tableCard" ref={tableWrapRef}>
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
        onPick={handlePick}
      />
    </section>
  );
}