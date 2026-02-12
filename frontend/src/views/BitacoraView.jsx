import React from "react";

function BitacorasTable({ title, rows, onOpen, onDownload, emptyText }) {
  return (
    <div style={{ marginTop: 12 }} className="card">
      <h3 style={{ margin: "0 0 10px 0" }}>{title}</h3>

      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Nº equipos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((b) => (
                <tr key={b.id}>
                  <td>{b.fecha || "SIN FECHA"}</td>
                  <td>{b.nombre}</td>
                  <td>{b.itemsCount ?? 0}</td>
                  <td style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button className="nav-btn" onClick={() => onOpen(b)}>Abrir</button>
                    <button className="nav-btn" onClick={() => onDownload(b)}>Descargar</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="small muted">{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BitacoraView({ bitacorasWithFecha, bitacorasSinFecha, onNew, onOpen, onDownload }) {
  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Bitácoras</h2>
        <div><button className="btn" onClick={onNew}>Nueva bitácora</button></div>
      </div>

      <BitacorasTable
        title="Bitácoras por fecha"
        rows={bitacorasWithFecha}
        onOpen={onOpen}
        onDownload={onDownload}
        emptyText="No hay bitácoras con fecha."
      />

      <BitacorasTable
        title="Registros sin fecha"
        rows={bitacorasSinFecha}
        onOpen={onOpen}
        onDownload={onDownload}
        emptyText="No hay registros con fecha NULL."
      />
    </section>
  );
}
