import React, { useMemo, useRef, useState } from 'react'
import Modal from '../components/Modal.jsx'
import logoLeft from '../assets/logo_left.png'
import logoRight from '../assets/logo_right.png'
import TableScrollHint from '../components/TableScrollHint.jsx'
import { exportServicioPdf } from '../utils/pdfExport.js'

import '../styles/Formulario.css'
import '../styles/TableScrollHint.css'

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
    serie: '',
    inv: '',
    falla: '',
    actividades: '',
    refacciones: '',
    observaciones: '',
    tecnico: '',
  }
}

export default function Formulario({
  inventario,
  pendientes,
  setPendientes,
  terminados,
  setTerminados,
  toast,
}) {
  const t = toast || {
    success: (m) => alert(m),
    error: (m) => alert(m),
    info: (m) => alert(m),
    confirm: async (m) => confirm(m),
  }

  const [tab, setTab] = useState('pendientes')
  const [q, setQ] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editIndex, setEditIndex] = useState(-1)
  const tableWrapRef = useRef(null)

  const [fromPendienteRef, setFromPendienteRef] = useState(null)

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
    return (terminados || []).filter((tt) => {
      const blob = `${tt?.inventario || ''} ${tt?.nombre || ''} ${tt?.serie || ''} ${tt?.area || ''} ${tt?.tecnico || ''}`
        .toLowerCase()
      return blob.includes(s)
    })
  }, [terminados, q])

  async function downloadServicePdf() {
  try {
    if (!svc.inv?.trim()) return t.error('Falta No. de inventario')
    if (!svc.equipo?.trim()) return t.error('Falta nombre del equipo')
    if (!svc.inicio?.trim()) return t.error('Falta fecha de inicio')
    if (!svc.tecnico?.trim()) return t.error('Falta técnico responsable')
    if (!svc.falla?.trim()) return t.error('Falta la falla reportada')
    if (!svc.actividades?.trim()) return t.error('Faltan las actividades realizadas')

    const fechaActual = todayISO()

    await exportServicioPdf({
      servicio: svc,
      fechaTermino: fechaActual,
      logoLeftUrl: logoLeft,
      logoRightUrl: logoRight,
    })

    t.success('PDF generado correctamente.')
  } catch (err) {
    console.error(err)
    t.error('No se pudo generar el PDF de la orden de servicio.')
  }
}

  function resetService() {
    setSvc(emptySvc())
    setEditIndex(-1)
    setFormMode('create')
    setFromPendienteRef(null)
  }

  function openCreateFromPendiente(p) {
    const invNum = String(p?.inventario ?? '').trim()
    const eq = (inventario || []).find((e) => String(e?.numero_inventario ?? '').trim() === invNum)

    setFormMode('create')
    setEditIndex(-1)
    setFromPendienteRef(p)

    const fallaTxt =
      typeof p?.falla === 'string'
        ? p.falla
        : (p?.falla?.observaciones || '')

    setSvc((s) => ({
      ...s,
      area: eq?.nombre_area || p?.area || s.area,
      equipo: eq?.nombre_equipo || p?.nombre || '',
      marca: eq?.marca || s.marca,
      modelo: eq?.modelo || s.modelo,
      serie: eq?.numero_serie || p?.serie || s.serie,
      inv: eq?.numero_inventario || p?.inventario || '',
      inicio: (p?.fecha && String(p.fecha).length >= 8) ? p.fecha : todayISO(),
      falla: fallaTxt || s.falla,
    }))

    setFormOpen(true)
  }

  function openEditTerminado(t0, idx) {
    setFormMode('edit')
    setEditIndex(idx)

    setSvc({
      area: t0?.area || '—',
      inicio: t0?.inicio || todayISO(),
      equipo: t0?.nombre || '',
      marca: t0?.marca || '',
      modelo: t0?.modelo || '',
      serie: t0?.serie || '',
      inv: t0?.inventario || '',
      falla: t0?.falla || '',
      actividades: t0?.actividades || '',
      refacciones: t0?.refacciones || '',
      observaciones: t0?.observaciones || '',
      tecnico: t0?.tecnico || '',
    })

    setFormOpen(true)
  }

  async function openDeletePrompt(kind, item) {
    const ok = await t.confirm('¿Seguro que deseas eliminar este registro?', {
      title: 'Confirmación',
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      okVariant: 'danger',
    })
    if (!ok) return

    if (kind === 'pendientes') {
      setPendientes((prev) => (prev || []).filter((p) => p !== item))
      t.success('Pendiente eliminado.')
      return
    }

    if (kind === 'terminados') {
      setTerminados((prev) => (prev || []).filter((x) => x !== item))
      t.success('Terminado eliminado.')
    }
  }

  function saveService() {
    if (!svc.inv?.trim()) return t.error('Falta No. de inventario')
    if (!svc.equipo?.trim()) return t.error('Falta nombre del equipo')
    if (!svc.inicio?.trim()) return t.error('Falta fecha de inicio')
    if (!svc.tecnico?.trim()) return t.error('Falta técnico responsable')
    if (!svc.falla?.trim()) return t.error('Falta la falla reportada')
    if (!svc.actividades?.trim()) return t.error('Faltan las actividades realizadas')

    const registro = {
      serie: svc.serie?.trim() || 'S/N',
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
      t.success('Terminado actualizado.')
      setFormOpen(false)
      resetService()
      return
    }

    setTerminados((prev) => [registro, ...(prev || [])])

    if (fromPendienteRef) {
      setPendientes((prev) => (prev || []).filter((p) => p !== fromPendienteRef))
    }

    t.success('Formulario guardado en Terminados.')
    setFormOpen(false)
    resetService()
    setTab('terminados')
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

      <TableScrollHint
        targetRef={tableWrapRef}
        className="tableScrollHint formulario__scrollHint"
        text="Desliza para ver más columnas"
        sticky
      />

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

          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." />
        </div>

        <div className="formulario__tableWrap" ref={tableWrapRef}>
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
                          <button className="nav-btn" onClick={() => openDeletePrompt('pendientes', p)}>
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
                  filteredTerminados.map((t0, idx) => (
                    <tr key={idx}>
                      <td>{t0.serie}</td>
                      <td>{t0.nombre}</td>
                      <td>{t0.fecha_termino}</td>
                      <td>{t0.area}</td>
                      <td>{t0.inventario}</td>
                      <td>{t0.tecnico}</td>
                      <td>
                        <div className="formulario__rowActions">
                          <button className="btn" onClick={() => openEditTerminado(t0, idx)}>
                            Editar
                          </button>
                          <button className="nav-btn" onClick={() => openDeletePrompt('terminados', t0)}>
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
      </div>

      <Modal open={formOpen} title="Orden de servicio" onClose={() => setFormOpen(false)}>
        <div id="servicePreview">
          <div className="formulario__previewHeader">
            <div className="formulario__previewLeft">
              <div className="logo-small">
                <img src={logoLeft} alt="Logo" className="formulario__logoImg" />
              </div>
              <div className="small muted">
                Hospital de Especialidades
                <br />
                <strong>Dr. Antonio González Guevara</strong>
              </div>
            </div>

            <div className="small muted formulario__previewRight">
              ORDEN DE SERVICIO
              <br />
              <strong>{new Date().toLocaleDateString('es-MX')}</strong>
              <div style={{ marginTop: 6 }}>
                <img src={logoRight} alt="Logo" className="formulario__logoImg" />
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label>Área</label>
              <input value={svc.area} onChange={(e) => setSvc((s) => ({ ...s, area: e.target.value }))} />
            </div>

            <div>
              <label>Fecha de inicio</label>
              <input type="date" value={svc.inicio} onChange={(e) => setSvc((s) => ({ ...s, inicio: e.target.value }))} />
            </div>

            <div>
              <label>Equipo</label>
              <input value={svc.equipo} onChange={(e) => setSvc((s) => ({ ...s, equipo: e.target.value }))} />
            </div>

            <div>
              <label>Marca / Modelo / Serie / No. Inventario</label>
              <div className="formulario__tripleRow">
                <input value={svc.marca} onChange={(e) => setSvc((s) => ({ ...s, marca: e.target.value }))} placeholder="Marca" />
                <input value={svc.modelo} onChange={(e) => setSvc((s) => ({ ...s, modelo: e.target.value }))} placeholder="Modelo" />
                <input value={svc.serie} onChange={(e) => setSvc((s) => ({ ...s, serie: e.target.value }))} placeholder="Serie" />
                <input value={svc.inv} onChange={(e) => setSvc((s) => ({ ...s, inv: e.target.value }))} placeholder="Inventario" />
              </div>
            </div>

            <div>
              <label>Falla reportada</label>
              <textarea
                value={svc.falla}
                onChange={(e) => setSvc((s) => ({ ...s, falla: e.target.value }))}
                placeholder="Describe la falla reportada..."
              />
            </div>

            <div>
              <label>Actividades realizadas</label>
              <textarea
                value={svc.actividades}
                onChange={(e) => setSvc((s) => ({ ...s, actividades: e.target.value }))}
                placeholder="Describe las actividades realizadas..."
              />
            </div>

            <div>
              <label>Refacciones</label>
              <textarea value={svc.refacciones} onChange={(e) => setSvc((s) => ({ ...s, refacciones: e.target.value }))} />
            </div>

            <div>
              <label>Observaciones</label>
              <textarea value={svc.observaciones} onChange={(e) => setSvc((s) => ({ ...s, observaciones: e.target.value }))} />
            </div>

            <div>
              <label>Técnico responsable</label>
              <input value={svc.tecnico} onChange={(e) => setSvc((s) => ({ ...s, tecnico: e.target.value }))} />
              <div className="formulario__signRow">
                <div className="small muted">Firma de conformidad: _____________________</div>
                <div className="small muted">Firma técnico: _____________________</div>
              </div>
            </div>
          </div>

          <div className="formulario__modalActions">
            <button className="nav-btn" onClick={downloadServicePdf}>Imprimir</button>
            <button className="nav-btn" onClick={resetService}>Limpiar</button>
            <button className="btn" onClick={saveService}>Guardar</button>
          </div>
        </div>
      </Modal>
    </section>
  )
}