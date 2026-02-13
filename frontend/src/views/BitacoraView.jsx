import React from 'react'

export default function BitacoraView({ bitacoras, onNew, onOpen, onDownload }) {
  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Bitácoras</h2>
        <div><button className="btn" onClick={onNew}>Nueva bitácora</button></div>
      </div>

      <div style={{ marginTop: 12 }} className="card">
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
            {bitacoras.length ? bitacoras.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.nombre}</td>
                <td>{b.fecha}</td>
                <td>{b.items?.length || 0}</td>
                <td style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button className="nav-btn" onClick={() => onOpen(b)}>Abrir</button>
                  <button className="nav-btn" onClick={() => onDownload(b)}>Descargar</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="small muted">No hay bitácoras registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
