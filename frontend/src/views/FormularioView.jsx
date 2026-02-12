import React, { useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import logoLeft from '../assets/logo_left.png'
import logoRight from '../assets/logo_right.png'

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

export default function FormularioView({
  pendientes,
  setPendientes,
  terminados,
  setTerminados,
}) {
  const [tab, setTab] = useState('pendientes')
  const [q, setQ] = useState('')

  // Modal (crear / editar)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create') // create | edit
  const [editIndex, setEditIndex] = useState(null)
  const [svc, setSvc] = useState(emptySvc())

  const filteredPend = useMemo(() => {
    const t = q.toLowerCase().trim()
    if (!t) return pendientes
    return pendientes.filter(p =>
      `${p.nombre} ${p.inventario} ${p.area} ${p.serie} ${p.reporto}`.toLowerCase().includes(t)
    )
  }, [pendientes, q])

  const filteredTerm = useMemo(() => {
    const t = q.toLowerCase().trim()
    if (!t) return terminados
    return terminados.filter(p =>
      `${p.nombre} ${p.inventario} ${p.area} ${p.serie} ${p.tecnico}`.toLowerCase().includes(t)
    )
  }, [terminados, q])

  function openDeletePrompt(onConfirm) {
    const motivo = prompt('Motivo de eliminación:')
    if (!motivo || motivo.trim().length < 3) return
    onConfirm(motivo.trim())
  }

  function openCreateFromPendiente(p, idx) {
    // ✅ El botón "Crear formulario" abre el formulario vacío (como pediste).
    // Solo dejamos el área para ahorrar tecleo (si quieres 100% vacío, dime y lo quitamos).
    setFormMode('create')
    setEditIndex(null)
    setSvc({ ...emptySvc(), area: p?.area || 'Neonatología' })
    setFormOpen(true)
  }

  function openEditTerminado(t, idx) {
    setFormMode('edit')
    setEditIndex(idx)
    setSvc(s => ({
      ...s,
      area: t.area || 'Neonatología',
      equipo: t.nombre || '',
      inv: t.inventario || '',
      tecnico: t.tecnico || '',
      modelo: t.serie || '',
      // Estos campos no estaban en la tabla, así que quedan como estén
      inicio: '',
      marca: '',
      falla: '',
      actividades: '',
      refacciones: '',
      observaciones: '',
    }))
    setFormOpen(true)
  }

  function saveService() {
    const nuevo = {
      serie: svc.modelo?.trim() || '—',
      nombre: svc.equipo?.trim() || '—',
      fecha_termino: todayISO(),
      area: svc.area || '—',
      inventario: svc.inv?.trim() || '—',
      tecnico: svc.tecnico?.trim() || '—',
    }

    if (formMode === 'edit' && typeof editIndex === 'number') {
      setTerminados(prev => prev.map((x, i) => (i === editIndex ? { ...x, ...nuevo } : x)))
      alert('Formulario actualizado.')
    } else {
      setTerminados(prev => [nuevo, ...prev])
      alert('Orden guardada en formularios.')
    }

    setFormOpen(false)
    setSvc(emptySvc())
    setEditIndex(null)
    setFormMode('create')
  }

  function resetService() {
    setSvc(emptySvc())
  }

  function onAgregar() {
    // “Agregar” = crear un pendiente rápido (demo)
    const serie = svc.modelo?.trim() || `SN-${Math.floor(Math.random() * 900 + 100)}`
    const nuevo = {
      serie,
      nombre: svc.equipo?.trim() || 'Equipo sin nombre',
      fecha: todayISO(),
      area: svc.area || '—',
      inventario: svc.inv?.trim() || `INV-${Math.floor(Math.random() * 9000 + 1000)}`,
      reporto: 'Usuario',
    }
    setPendientes(prev => [nuevo, ...prev])
    alert('Pendiente agregado.')
  }

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Orden de Servicio</h2>
          <div className="small muted">Crea/edita el formulario desde los botones de la tabla.</div>
        </div>
      </div>

      {/* Tabs + tablas */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="tabs">
          <button className={'tab ' + (tab === 'pendientes' ? 'active' : '')} onClick={() => setTab('pendientes')}>
            Pendientes
          </button>
          <button className={'tab ' + (tab === 'terminados' ? 'active' : '')} onClick={() => setTab('terminados')}>
            Formularios
          </button>
        </div>

        <div className="actions-row">
          <input
            type="text"
            placeholder="Buscar por nombre, inventario, área, serie..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" onClick={onAgregar}>Agregar</button>
        </div>

        {tab === 'pendientes' ? (
          <table>
            <thead>
              <tr>
                <th>No. Serie</th>
                <th>Nombre</th>
                <th>Fecha reporte</th>
                <th>Área</th>
                <th>No. Inventario</th>
                <th>Reportó</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPend.length ? filteredPend.map((p, idx) => (
                <tr key={p.serie + idx}>
                  <td>{p.serie}</td>
                  <td>{p.nombre}</td>
                  <td>{p.fecha}</td>
                  <td>{p.area}</td>
                  <td>{p.inventario}</td>
                  <td>{p.reporto}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn" onClick={() => openCreateFromPendiente(p, idx)}>Crear formulario</button>
                    <button className="nav-btn" onClick={() => openDeletePrompt(() => {
                      setPendientes(prev => prev.filter((_, i) => i !== idx))
                    })}>Eliminar</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="small muted">No hay pendientes.</td></tr>
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
                <th>No. Inventario</th>
                <th>Técnico</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerm.length ? filteredTerm.map((t, idx) => (
                <tr key={t.serie + idx}>
                  <td>{t.serie}</td>
                  <td>{t.nombre}</td>
                  <td>{t.fecha_termino}</td>
                  <td>{t.area}</td>
                  <td>{t.inventario}</td>
                  <td>{t.tecnico}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn" onClick={() => openEditTerminado(t, idx)}>Editar</button>
                    <button className="nav-btn" onClick={() => openDeletePrompt(() => {
                      setTerminados(prev => prev.filter((_, i) => i !== idx))
                    })}>Eliminar</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="small muted">No hay formularios.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal del formulario */}
      <Modal
        open={formOpen}
        title={formMode === 'edit' ? 'Editar formulario' : 'Crear formulario'}
        onClose={() => setFormOpen(false)}
      >
        <div id="servicePreview">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="logo-small">
                <img src={logoLeft} alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
              </div>
              <div className="small muted">
                Hospital de Especialidades<br /><strong>Dr. Antonio Gonzalez Guevara</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }} className="small muted">
              ORDEN DE SERVICIO<br /><strong>{new Date().toLocaleDateString('es-MX')}</strong>
              <div style={{ marginTop: 6 }}>
                <img src={logoRight} alt="Logo" style={{ height: 44, objectFit: 'contain' }} />
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label>Área a realizar el servicio</label>
              <select value={svc.area} onChange={(e) => setSvc(s => ({ ...s, area: e.target.value }))}>
                <option>Neonatología</option>
                <option>Imagenología</option>
                <option>Cirugía</option>
                <option>Urgencias</option>
                <option>Pediatría</option>
              </select>
            </div>
            <div>
              <label>Fecha inicio</label>
              <input type="date" value={svc.inicio} onChange={(e) => setSvc(s => ({ ...s, inicio: e.target.value }))} />
            </div>

            <div>
              <label>Nombre del equipo</label>
              <input value={svc.equipo} onChange={(e) => setSvc(s => ({ ...s, equipo: e.target.value }))} placeholder="Cuna de calor radiante" />
            </div>

            <div>
              <label>Marca / Modelo / No. Inventario</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={svc.marca} onChange={(e) => setSvc(s => ({ ...s, marca: e.target.value }))} placeholder="Marca" />
                <input value={svc.modelo} onChange={(e) => setSvc(s => ({ ...s, modelo: e.target.value }))} placeholder="Modelo / Serie" />
                <input value={svc.inv} onChange={(e) => setSvc(s => ({ ...s, inv: e.target.value }))} placeholder="192504" />
              </div>
            </div>

            <div className="full">
              <label>Falla reportada</label>
              <input value={svc.falla} onChange={(e) => setSvc(s => ({ ...s, falla: e.target.value }))} />
            </div>

            <div className="full">
              <label>Actividades realizadas</label>
              <textarea rows={3} value={svc.actividades} onChange={(e) => setSvc(s => ({ ...s, actividades: e.target.value }))} />
            </div>

            <div>
              <label>Refacciones utilizadas</label>
              <input value={svc.refacciones} onChange={(e) => setSvc(s => ({ ...s, refacciones: e.target.value }))} />
            </div>

            <div>
              <label>Observaciones</label>
              <input value={svc.observaciones} onChange={(e) => setSvc(s => ({ ...s, observaciones: e.target.value }))} />
            </div>

            <div className="full signature">
              <label>Nombre quien realiza el servicio</label>
              <input value={svc.tecnico} onChange={(e) => setSvc(s => ({ ...s, tecnico: e.target.value }))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div className="small muted">Firma de conformidad:</div>
                <div className="small muted">_______________</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="nav-btn" onClick={() => window.print()}>Imprimir</button>
            <button className="nav-btn" onClick={resetService}>Limpiar</button>
            <button className="btn" onClick={saveService}>Guardar</button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
