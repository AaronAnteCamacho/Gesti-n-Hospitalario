import React, { useMemo, useState } from "react";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function InventarioView({
  auth,
  inventario,
  areas,
  categorias,
  onAdd,
  onEdit,
  onTrash,
  onReportFalla,
}) {
  const [filterText, setFilterText] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  const list = useMemo(() => {
    const t = norm(filterText);
    return (inventario || []).filter((it) => {
      const okArea = !filterArea || String(it.id_area) === String(filterArea);
      const okCat = !filterCategoria || String(it.id_categoria) === String(filterCategoria);
      const okText =
        !t ||
        norm(
          `${it.numero_inventario || ""} ${it.nombre_equipo || ""} ${it.marca || ""} ${it.modelo || ""} ${it.numero_serie || ""} ${it.ubicacion_especifica || ""}`
        ).includes(t);
      return okArea && okCat && okText;
    });
  }, [inventario, filterText, filterArea, filterCategoria]);

  function downloadAllInventario() {
    const tipo = (prompt('¿Descargar TODO como PDF o Excel? (pdf / excel)') || '').toLowerCase();
    const data = inventario || [];

    if (tipo === 'pdf') {
      const w = window.open('', '_blank');
      const html = `
        <h2>Inventario (Total: ${data.length})</h2>
        <table border="1" style="border-collapse:collapse;width:100%">
          <thead>
            <tr>
              <th>ID</th><th>Inventario</th><th>Equipo</th><th>Marca</th><th>Modelo</th><th>No. Serie</th><th>Ubicación</th><th>Área</th><th>Categoría</th><th>Estado</th><th>Fecha registro</th>
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (it) => `
              <tr>
                <td>${it.id_equipo ?? ''}</td>
                <td>${it.numero_inventario ?? ''}</td>
                <td>${it.nombre_equipo ?? ''}</td>
                <td>${it.marca ?? ''}</td>
                <td>${it.modelo ?? ''}</td>
                <td>${it.numero_serie ?? ''}</td>
                <td>${it.ubicacion_especifica ?? ''}</td>
                <td>${it.nombre_area ?? it.id_area ?? ''}</td>
                <td>${it.nombre_categoria ?? it.id_categoria ?? ''}</td>
                <td>${it.activo ? 'Activo' : 'Inactivo'}</td>
                <td>${it.fecha_registro ? String(it.fecha_registro).slice(0, 10) : ''}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
      w.document.write(html);
      w.document.close();
      w.print();
      return;
    }

    if (tipo === 'excel') {
      const rows = [
        ['ID', 'Inventario', 'Equipo', 'Marca', 'Modelo', 'No. Serie', 'Ubicación', 'Área', 'Categoría', 'Estado', 'Fecha registro'],
        ...data.map((it) => [
          it.id_equipo ?? '',
          it.numero_inventario ?? '',
          it.nombre_equipo ?? '',
          it.marca ?? '',
          it.modelo ?? '',
          it.numero_serie ?? '',
          it.ubicacion_especifica ?? '',
          it.nombre_area ?? it.id_area ?? '',
          it.nombre_categoria ?? it.id_categoria ?? '',
          it.activo ? 'Activo' : 'Inactivo',
          it.fecha_registro ? String(it.fecha_registro).slice(0, 10) : '',
        ]),
      ];

      const csv = rows
        .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_total.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    alert('Escribe "pdf" o "excel".');
  }

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Inventario</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={onAdd}>
            Agregar
          </button>
          <button className="btn" onClick={downloadAllInventario}>
            <i className="fa-solid fa-download" style={{ marginRight: 8 }}></i>
            Descargar todo
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }} className="card">
        <label>Buscar / filtrar</label>
        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Inventario, nombre, marca, modelo, serie, ubicación..."
          />

          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="">Área (todas)</option>
            {(areas || []).map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nombre_area}
              </option>
            ))}
          </select>

          <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)}>
            <option value="">Categoría (todas)</option>
            {(categorias || []).map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre_categoria}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 10, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Inventario</th>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>No. Serie</th>
              <th>Ubicación</th>
              <th>Área</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Fecha registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map((it) => (
              <tr key={it.id_equipo}>
                <td>{it.id_equipo}</td>
                <td>{it.numero_inventario}</td>
                <td style={{ minWidth: 240 }}>{it.nombre_equipo}</td>
                <td>{it.marca || "—"}</td>
                <td>{it.modelo || "—"}</td>
                <td>{it.numero_serie || "—"}</td>
                <td style={{ minWidth: 200 }}>{it.ubicacion_especifica || "—"}</td>
                <td>{it.nombre_area || it.id_area}</td>
                <td>{it.nombre_categoria || it.id_categoria}</td>
                <td>{it.activo ? "Activo" : "Inactivo"}</td>
                <td>{it.fecha_registro ? String(it.fecha_registro).slice(0, 10) : "—"}</td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="nav-btn" onClick={() => onReportFalla?.(it)}>
                    Enviar a bitácora
                  </button>

                  <button className="btn" onClick={() => onEdit?.(it)}>
                    Editar
                  </button>
                  <button className="btn danger" onClick={() => onTrash?.(it)}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={12} className="muted">
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
