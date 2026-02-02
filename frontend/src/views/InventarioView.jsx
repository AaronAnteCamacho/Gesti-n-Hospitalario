import React, { useMemo, useState } from 'react'

function getItemKey(it) {
  return it?.id_equipo || it?.id || it?.numero_inventario || it?.inv
}

export default function InventarioView({
  inventario,
  onOpenDetail,
  onDownload,
  onUpsert,
  onDelete,       // ✅ nuevo (lo agregamos en App.jsx)
  onDeleteMany,   // ✅ nuevo (lo agregamos en App.jsx)
}) {
  const [filterText, setFilterText] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [selected, setSelected] = useState([]) // keys seleccionados

  const list = useMemo(() => {
    const t = filterText.toLowerCase().trim()
    return (inventario || []).filter((it) => {
      const hayArea = !filterArea || (it.area || '') === filterArea
      const hayText =
        !t ||
        (`${it.nombre || ''} ${it.marca || ''} ${it.numero_inventario || it.inv || ''}`
          .toLowerCase()
          .includes(t))
      return hayArea && hayText
    })
  }, [inventario, filterText, filterArea])

  const areas = useMemo(() => {
    const set = new Set()
    ;(inventario || []).forEach((it) => {
      if (it.area) set.add(it.area)
    })
    return Array.from(set)
  }, [inventario])

  function toggleSelect(it) {
    const key = getItemKey(it)
    if (!key) return
    setSelected((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))
  }

  function selectAllVisible() {
    const keys = list.map(getItemKey).filter(Boolean)
    setSelected(keys)
  }

  function clearSelection() {
    setSelected([])
  }

  function downloadAllInventario() {
    const tipo = (prompt('¿Descargar TODO como PDF o Excel? (pdf / excel)') || '').toLowerCase()

    // Descargar TODO el inventario (no solo filtrado)
    const data = inventario || []

    if (tipo === 'pdf') {
      const w = window.open('', '_blank')
      const html = `
        <h2>Inventario (Total: ${data.length})</h2>
        <table border="1" style="border-collapse:collapse;width:100%">
          <thead>
            <tr>
              <th>Inv</th><th>Equipo</th><th>Marca</th><th>Modelo</th><th>Área</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(it => `
              <tr>
                <td>${it.numero_inventario || it.inv || it.id || ''}</td>
                <td>${it.nombre || it.equipo || ''}</td>
                <td>${it.marca || ''}</td>
                <td>${it.modelo || ''}</td>
                <td>${it.area || ''}</td>
                <td>${it.estatus || it.estado || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      w.document.write(html)
      w.document.close()
      w.print()
      return
    }

    if (tipo === 'excel') {
      const rows = [
        ['Inv', 'Equipo', 'Marca', 'Modelo', 'Área', 'Estado'],
        ...data.map((it) => [
          it.numero_inventario || it.inv || it.id || '',
          it.nombre || it.equipo || '',
          it.marca || '',
          it.modelo || '',
          it.area || '',
          it.estatus || it.estado || '',
        ]),
      ]
      const csv = rows
        .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventario_total.csv`
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    alert('Escribe "pdf" o "excel".')
  }

  function handleDeleteSelected() {
    if (!selected.length) return alert('No hay elementos seleccionados.')
    if (!confirm(`¿Eliminar ${selected.length} elemento(s) seleccionados?`)) return

    if (typeof onDeleteMany === 'function') {
      onDeleteMany(selected)
      clearSelection()
      return
    }

    alert('Eliminar seleccionados no está configurado en App.jsx (falta onDeleteMany).')
  }

  function handleDeleteOne(it) {
    if (!confirm(`¿Eliminar inventario ${it.numero_inventario || it.inv || it.id}?`)) return

    if (typeof onDelete === 'function') {
      onDelete(it)
      // si borras uno que estaba seleccionado, lo quito del array
      const k = getItemKey(it)
      setSelected((prev) => prev.filter((x) => x !== k))
      return
    }

    alert('Eliminar no está configurado en App.jsx (falta onDelete).')
  }

  return (
    <section className="card">
      {/* TÍTULO + AGREGAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Inventario</h2>
        <div>
          <button className="btn" onClick={() => onUpsert(null)}>Agregar</button>
        </div>
      </div>

      {/* BUSCAR / FILTRAR + BOTONES */}
      <div style={{ marginTop: 12 }} className="card">
        <label>Buscar / filtrar</label>

        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Nombre, marca o número de inventario"
          />

          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="">Área (todas)</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* ✅ APLICAR + DESCARGAR TODO (pegados, como pediste) */}
          <button className="btn" onClick={() => { /* filtros en vivo */ }}>
            Aplicar
          </button>

          <button className="btn" onClick={downloadAllInventario} title="Descargar TODO el inventario">
            <i className="fa-solid fa-download" style={{ marginRight: 8 }}></i>
            Descargar todo
          </button>

          {/* ✅ donde “estaba descargar” (acciones) -> botón ELIMINAR (seleccionados) */}
          <button className="btn ghost" onClick={handleDeleteSelected} disabled={!selected.length} title="Eliminar seleccionados">
            <i className="fa-solid fa-trash" style={{ marginRight: 8 }}></i>
            Eliminar
          </button>
        </div>

        <div className="small muted" style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span>Resultados: <strong>{list.length}</strong></span>
          <span>Seleccionados: <strong>{selected.length}</strong></span>
          <button className="nav-btn" onClick={selectAllVisible}>Seleccionar visibles</button>
          <button className="nav-btn" onClick={clearSelection}>Limpiar selección</button>
        </div>
      </div>

      {/* TABLA */}
      <div style={{ marginTop: 12 }} className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Inv</th>
              <th>Equipo</th>
              <th>Marca</th>
              <th>Área</th>
              <th>Estado</th>
              <th style={{ width: 170 }}></th>
            </tr>
          </thead>

          <tbody>
            {list.length ? list.map((it) => {
              const key = getItemKey(it)
              const checked = selected.includes(key)

              return (
                <tr key={key}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(it)}
                    />
                  </td>

                  <td>{it.numero_inventario || it.inv || it.id}</td>
                  <td>{it.nombre || it.equipo}</td>
                  <td>{it.marca || '—'}</td>
                  <td>{it.area || '—'}</td>
                  <td>{it.estatus || it.estado || '—'}</td>

                  {/* ✅ ICONOS: descargar / abrir / editar / borrar */}
                  <td style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="icon-btn" title="Descargar" onClick={() => onDownload(it)}>
                      <i className="fa-solid fa-download"></i>
                    </button>

                    <button className="icon-btn" title="Abrir" onClick={() => onOpenDetail(it)}>
                      <i className="fa-solid fa-folder-open"></i>
                    </button>

                    <button className="icon-btn" title="Editar" onClick={() => onUpsert(it)}>
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>

                    <button className="icon-btn" title="Borrar" onClick={() => handleDeleteOne(it)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan={7} className="small muted">No hay resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
