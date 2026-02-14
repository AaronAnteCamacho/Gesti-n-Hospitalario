import React, { useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import logoLeft from '../assets/logo_left.png'
import logoRight from '../assets/logo_right.png'

import '../styles/Formulario.css'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptySvc() {
  return {
    area: 'Neonatología',
    inicio: '',
    equipo: '',
    marca: '',
    modelo: '',
    inv: '',
    falla: '',
    actividades: '',
    refacciones: '',
    observaciones: '',
    tecnico: '',
  }
}

export default function Formulario({
  pendientes,
  setPendientes,
  terminados,
  setTerminados,
}) {
  const [tab, setTab] = useState('pendientes')
  const [q, setQ] = useState('')

  // Modal (crear / editar)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create') // 'create' | 'edit'
  const [editIndex, setEditIndex] = useState(-1)

  const [svc, setSvc] = useState(emptySvc())

  const filteredPendientes = useMemo(() => {
    const s = (q || '').toLowerCase().trim()
    if (!s) return pendientes || []
    return (pendientes || []).filter((p) => {
      const blob = `${p?.inventario || ''} ${p?.nombre || ''} ${p?.serie || ''} ${p?.area || ''} ${p?.reporto || ''}`
        .toLowerCase()
      return blob.includes(s)
    })
  }, [pendientes, q])

  const filteredTerminados = useMemo(() => {
    const s = (q || '').toLowerCase().trim()
    if (!s) return terminados || []
    return (terminados || []).filter((t) => {
      const blob = `${t?.inventario || ''} ${t?.nombre || ''} ${t?.serie || ''} ${t?.area || ''} ${t?.tecnico || ''}`
        .toLowerCase()
      return blob.includes(s)
    })
  }, [terminados, q])

  function resetService() {
    setSvc(emptySvc())
    setEditIndex(-1)
    setFormMode('create')
  }

  function openCreateFromPendiente(p) {
    setFormMode('create')
    setEditIndex(-1)

    setSvc((s) => ({
      ...s,
      area: p?.area || s.area,
      equipo: p?.nombre || '',
      inv: p?.inventario || '',
      inicio: todayISO(),
    }))

    setFormOpen(true)
  }

  function openEditTerminado(t, idx) {
    setFormMode('edit')
    setEditIndex(idx)

    setSvc({
      area: t?.area || '—',
      inicio: t?.inicio || todayISO(),
      equipo: t?.nombre || '',
      marca: t?.marca || '',
      modelo: t?.modelo || '',
      inv: t?.inventario || '',
      falla: t?.falla || '',
      actividades: t?.actividades || '',
      refacciones: t?.refacciones || '',
      observaciones: t?.observaciones || '',
      tecnico: t?.tecnico || '',
    })

    setFormOpen(true)
  }

  function openDeletePrompt(kind, idx) {
    const ok = confirm('¿Seguro que deseas eliminar este registro?')
    if (!ok) return

    if (kind === 'pendientes') {
      setPendientes((prev) => (prev || []).filter((_, i) => i !== idx))
      alert('Pendiente eliminado.')
      return
    }

    if (kind === 'terminados') {
      setTerminados((prev) => (prev || []).filter((_, i) => i !== idx))
      alert('Terminado eliminado.')
    }
  }

  function saveService() {
    // validaciones mínimas
    if (!svc.inv?.trim()) return alert('Falta No. de inventario')
    if (!svc.equipo?.trim()) return alert('Falta nombre del equipo')
    if (!svc.inicio?.trim()) return alert('Falta fecha de inicio')
    if (!svc.tecnico?.trim()) return alert('Falta técnico responsable')

    const registro = {
      serie: 'S/N',
      nombre: svc.equipo,
      inicio: svc.inicio,
      area: svc.area,
      inventario: svc.inv,

      marca: svc.marca,
      modelo: svc.modelo,
      falla: svc.falla,
      actividades: svc.actividades,
      refacciones: svc.refacciones,
      observaciones: svc.observaciones,

      tecnico: svc.tecnico,
      fecha_termino: todayISO(),
    }

    if (formMode === 'edit' && editIndex >= 0) {
      setTerminados((prev) => {
        const list = [...(prev || [])]
        list[editIndex] = { ...(list[editIndex] || {}), ...registro }
        return list
      })
      alert('Terminado actualizado.')
      setFormOpen(false)
      resetService()
      return
    }

    // create: mover a terminados y (si quieres) eliminar de pendientes
    setTerminados((prev) => [registro, ...(prev || [])])
    alert('Formulario guardado en Terminados.')
    setFormOpen(false)
    resetService()
  }

  return (
    <section className="card formulario">
      <div className="formulario__header">
        <div>
          <h2 className="formulario__title">Orden de Servicio</h2>
          <div className="small muted">
            Crea/edita el formulario desde los botones de la tabla.
          </div>
        </div>
      </div>

      {/* Tabs + tablas */}
      <div className="card formulario__tabsCard">
        <div className="tabs">
          <button
            className={'tab ' + (tab === 'pendientes' ? 'active' : '')}
            onClick={() => setTab('pendientes')}
          >
            Pendientes
          </button>
          <button
            className={'tab ' + (tab === 'terminados' ? 'active' : '')}
            onClick={() => setTab('terminados')}
          >
            Terminados
          </button>

          <div style={{ flex: 1 }} />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
          />
        </div>

        {tab === 'pendientes' ? (
          <table>
            <thead>
              <tr>
                <th>No. Serie</th>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Área</th>
                <th>Inventario</th>
                <th>Reportó</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredPendientes?.length ? (
                filteredPendientes.map((p, idx) => (
                  <tr key={idx}>
                    <td>{p.serie}</td>
                    <td>{p.nombre}</td>
                    <td>{p.fecha}</td>
                    <td>{p.area}</td>
                    <td>{p.inventario}</td>
                    <td>{p.reporto}</td>
                    <td>
                      <div className="formulario__rowActions">
                        <button className="btn" onClick={() => openCreateFromPendiente(p)}>
                          Crear formulario
                        </button>
                        <button className="nav-btn" onClick={() => openDeletePrompt('pendientes', idx)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="small muted">
                    No hay pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th>No. Serie</th>
                <th>Nombre</th>
                <th>Fecha término</th>
                <th>Área</th>
                <th>Inventario</th>
                <th>Técnico</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredTerminados?.length ? (
                filteredTerminados.map((t, idx) => (
                  <tr key={idx}>
                    <td>{t.serie}</td>
                    <td>{t.nombre}</td>
                    <td>{t.fecha_termino}</td>
                    <td>{t.area}</td>
                    <td>{t.inventario}</td>
                    <td>{t.tecnico}</td>
                    <td>
                      <div className="formulario__rowActions">
                        <button className="btn" onClick={() => openEditTerminado(t, idx)}>
                          Editar
                        </button>
                        <button className="nav-btn" onClick={() => openDeletePrompt('terminados', idx)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="small muted">
                    No hay terminados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: formulario */}
      <Modal open={formOpen} title="Orden de servicio" onClose={() => setFormOpen(false)}>
        <div id="servicePreview">
          <div className="formulario__previewHeader">
            <div className="formulario__previewLeft">
              <div className="logo-small">
                <img src={logoLeft} alt="Logo" className="formulario__logoImg" />
              </div>
              <div className="small muted">
                Hospital de Especialidades<br />
                <strong>Dr. Antonio González Guevara</strong>
              </div>
            </div>

            <div className="small muted formulario__previewRight">
              ORDEN DE SERVICIO<br />
              <strong>{new Date().toLocaleDateString('es-MX')}</strong>
              <div style={{ marginTop: 6 }}>
                <img src={logoRight} alt="Logo" className="formulario__logoImg" />
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label>Área</label>
              <input value={svc.area} onChange={(e) => setSvc(s => ({ ...s, area: e.target.value }))} />
            </div>

            <div>
              <label>Fecha de inicio</label>
              <input type="date" value={svc.inicio} onChange={(e) => setSvc(s => ({ ...s, inicio: e.target.value }))} />
            </div>

            <div>
              <label>Equipo</label>
              <input value={svc.equipo} onChange={(e) => setSvc(s => ({ ...s, equipo: e.target.value }))} />
            </div>

            <div>
              <label>Marca / Modelo / No. Inventario</label>
              <div className="formulario__tripleRow">
                <input value={svc.marca} onChange={(e) => setSvc(s => ({ ...s, marca: e.target.value }))} placeholder="Marca" />
                <input value={svc.modelo} onChange={(e) => setSvc(s => ({ ...s, modelo: e.target.value }))} placeholder="Modelo" />
                <input value={svc.inv} onChange={(e) => setSvc(s => ({ ...s, inv: e.target.value }))} placeholder="Inventario" />
              </div>
            </div>

            <div>
              <label>Falla reportada</label>
              <textarea value={svc.falla} onChange={(e) => setSvc(s => ({ ...s, falla: e.target.value }))} />
            </div>

            <div>
              <label>Actividades realizadas</label>
              <textarea value={svc.actividades} onChange={(e) => setSvc(s => ({ ...s, actividades: e.target.value }))} />
            </div>

            <div>
              <label>Refacciones</label>
              <textarea value={svc.refacciones} onChange={(e) => setSvc(s => ({ ...s, refacciones: e.target.value }))} />
            </div>

            <div>
              <label>Observaciones</label>
              <textarea value={svc.observaciones} onChange={(e) => setSvc(s => ({ ...s, observaciones: e.target.value }))} />
            </div>

            <div>
              <label>Técnico responsable</label>
              <input value={svc.tecnico} onChange={(e) => setSvc(s => ({ ...s, tecnico: e.target.value }))} />
              <div className="formulario__signRow">
                <div className="small muted">Firma de conformidad: _____________________</div>
                <div className="small muted">Firma técnico: _____________________</div>
              </div>
            </div>
          </div>

          <div className="formulario__modalActions">
            <button className="nav-btn" onClick={() => window.print()}>Imprimir</button>
            <button className="nav-btn" onClick={resetService}>Limpiar</button>
            <button className="btn" onClick={saveService}>Guardar</button>
          </div>
        </div>
      </Modal>
    </section>
  )
}