import React, { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import Modal from './components/Modal.jsx'
import { useLocalStorageState } from './components/useLocalStorageState.js'

import HomeView from './views/HomeView.jsx'
import InventarioView from './views/InventarioView.jsx'
import BitacoraView from './views/BitacoraView.jsx'
import FormularioView from './views/FormularioView.jsx'
import LoginView from './views/LoginView.jsx'
import PerfilUsuariosView from "./views/PerfilUsuariosView";
import { apiFetch } from "./services/api.js";



function isoDate() {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const [view, setView] = useState('home')

  const [inventario, setInventario] = React.useState([]);
  const [bitacoras, setBitacoras] = useLocalStorageState('bitacoras', [])
  const [formularios, setFormularios] = useLocalStorageState('formularios', [])


  const [pendientes, setPendientes] = useLocalStorageState('pendientes', [])
  const [terminados, setTerminados] = useLocalStorageState('terminados', [])
  const [auth, setAuth] = React.useState(() => {
  return JSON.parse(localStorage.getItem('auth') || "null");
});



if (!auth) {
  return <LoginView onLogin={() => setAuth(JSON.parse(localStorage.getItem('auth') || "null"))} />
}
async function loadInventario() {
  const r = await apiFetch("/api/equipos");

  const mapped = (r.data || []).map((x) => ({
    id_equipo: x.id_equipo,
    numero_inventario: x.numero_inventario,
    nombre: x.nombre_equipo,
    marca: x.marca,
    modelo: x.modelo,
    numero_serie: x.numero_serie,
    ubicacion_especifica: x.ubicacion_especifica,
    id_categoria: x.id_categoria,
    categoria: x.nombre_categoria,
    id_area: x.id_area,
    area: x.nombre_area,
    estatus: x.activo ? "Activo" : "Inactivo",
    activo: x.activo,
  }));

  setInventario(mapped);
}

React.useEffect(() => {
  if (!auth?.token) return; // si no hay login, no hace nada
  loadInventario().catch((e) => alert(e.message));
}, [auth?.token]);

  // Demo seed
  React.useEffect(() => {
    if (inventario.length === 0) {
      setInventario([
        { id: 1, numero_inventario: '192571', nombre: 'Monitor', categoria: 'Equipo Médico', cantidad: 5, marca: 'OHMEDA', area: 'Urgencias', estatus: 'Activo' },
        { id: 2, numero_inventario: '192572', nombre: 'Bomba de Infusión', categoria: 'Equipo Médico', cantidad: 3, marca: 'XYZ', area: 'Pediatría', estatus: 'Activo' },
      ])
    }
    if (bitacoras.length === 0) {
      setBitacoras([
        { id: 1, nombre: 'Mantenimiento Octubre', fecha: '2025-10-01', items: [
          { fecha: '2025-10-01', equipo: 'Monitor', actividad: 'Revisión', refacciones: '', observaciones: 'OK' },
        ] }
      ])
    }
    if (pendientes.length === 0) {
      setPendientes([
        { serie: 'SN-001', nombre: 'Monitor de signos vitales', fecha: '2025-10-01', area: 'Urgencias', inventario: 'INV-1001', reporto: 'Enfermería' },
        { serie: 'SN-002', nombre: 'Bomba de infusión', fecha: '2025-10-03', area: 'Pediatría', inventario: 'INV-1002', reporto: 'Médico residente' },
      ])
    }
    if (terminados.length === 0) {
      setTerminados([
        { serie: 'SN-010', nombre: 'Cuna térmica', fecha_termino: '2025-09-28', area: 'Neonatología', inventario: 'INV-2001', tecnico: 'Ing. López' },
      ])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [modal, setModal] = useState({ open: false, title: '', body: null })

  function openModal(title, body) {
    setModal({ open: true, title, body })
  }
  function closeModal() {
    setModal({ open: false, title: '', body: null })
  }

  function upsertInventario(existing) {
    const initial = existing || { numero_inventario: '', nombre: '', marca: '', modelo: '', area: 'Neonatología', estatus: 'Activo', categoria: '', cantidad: 1, descripcion: '' }
    let draft = { ...initial }

    openModal(existing ? 'Editar inventario' : 'Crear inventario', (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const inv = (draft.numero_inventario || '').trim()
          if (!inv) return alert('Ingrese número de inventario')

          setInventario((prev) => {
            const idx = prev.findIndex(x => String(x.numero_inventario) === inv)
            const record = { ...draft, numero_inventario: inv, id: draft.id || Date.now() }
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = record
              return next
            }
            return [record, ...prev]
          })
          closeModal()
          alert('Inventario guardado.')
        }}
      >
        <div><label>Número de inventario</label><input defaultValue={draft.numero_inventario} onChange={(e)=> draft.numero_inventario = e.target.value} /></div>
        <div><label>Equipo</label><input defaultValue={draft.nombre} onChange={(e)=> draft.nombre = e.target.value} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label>Marca</label><input defaultValue={draft.marca} onChange={(e)=> draft.marca = e.target.value} /></div>
          <div style={{ flex: 1 }}><label>Modelo</label><input defaultValue={draft.modelo} onChange={(e)=> draft.modelo = e.target.value} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Área</label>
            <select defaultValue={draft.area} onChange={(e)=> draft.area = e.target.value}>
              <option>Neonatología</option>
              <option>Medicina interna</option>
              <option>Diálisis</option>
              <option>Cirugía</option>
              <option>Imagenología</option>
              <option>Consulta externa</option>
              <option>Urgencias adulto</option>
              <option>Terapia intensiva adulto</option>
              <option>Pediatría</option>
            </select>
          </div>
          <div style={{ flex: 1 }}><label>Estado</label><input defaultValue={draft.estatus} onChange={(e)=> draft.estatus = e.target.value} /></div>
        </div>
        <div><label>Descripción</label><textarea defaultValue={draft.descripcion} onChange={(e)=> draft.descripcion = e.target.value}></textarea></div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="nav-btn" onClick={closeModal}>Cancelar</button>
          <button type="submit" className="btn">{existing ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    ))
  }

  function openInventarioDetail(item) {
    openModal(`Inventario ${item.numero_inventario || item.id}`, (
      <div>
        <strong>{item.nombre || '—'}</strong><br />
        Categoría: {item.categoria || '—'}<br />
        Marca: {item.marca || '—'}<br />
        Área: {item.area || '—'}<br />
        Estado: {item.estatus || '—'}<br />
        <div className="small muted" style={{ marginTop: 8 }}>{item.descripcion || ''}</div>
      </div>
    ))
  }

  function deleteInventario(item) {
  const key = item?.id_equipo || item?.id || item?.numero_inventario || item?.inv
  if (!key) return

  setInventario((prev) =>
    prev.filter((x) => (x?.id_equipo || x?.id || x?.numero_inventario || x?.inv) !== key)
  )
  alert('Inventario eliminado.')
}

function deleteInventarioMany(keys) {
  const setKeys = new Set(keys || [])
  setInventario((prev) =>
    prev.filter((x) => !setKeys.has(x?.id_equipo || x?.id || x?.numero_inventario || x?.inv))
  )
  alert('Inventarios eliminados.')
}


  function downloadInventario(item) {
    const tipo = (prompt('¿Descargar como PDF o Excel? (pdf / excel)') || '').toLowerCase()
    if (tipo === 'pdf') {
      const w = window.open('', '_blank')
      w.document.write(`<h2>Inventario ${item.numero_inventario || item.id}</h2>
        <p><strong>${item.nombre || ''}</strong></p>
        <p>Categoría: ${item.categoria || ''}</p>
        <p>Marca: ${item.marca || ''}</p>
        <p>Área: ${item.area || ''}</p>
        <p>Estado: ${item.estatus || ''}</p>`)
      w.document.close()
      w.print()
    } else if (tipo === 'excel') {
      const rows = [['Inv','Equipo','Categoría','Marca','Área','Estado'],
        [item.numero_inventario || item.id, item.nombre || '', item.categoria || '', item.marca || '', item.area || '', item.estatus || '']]
      const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventario_${item.numero_inventario || item.id}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  function createNewBitacora() {
    const nombre = prompt('Nombre de la bitácora:')
    if (!nombre) return
    setBitacoras(prev => [{ id: Date.now(), nombre, fecha: isoDate(), items: [] }, ...prev])
  }

  function openBitacoraDetail(b) {
    openModal(`Bitácora #${b.id}`, (
      <div>
        <div><strong>{b.nombre}</strong></div>
        <div className="small muted">Fecha: {b.fecha} · Nº de artículos: {b.items?.length || 0}</div>
        <table style={{ marginTop: 10, width: '100%' }} border="1">
          <thead><tr><th>Fecha</th><th>Equipo</th><th>Actividad</th><th>Refacciones</th><th>Obs</th></tr></thead>
          <tbody>
            {(b.items || []).map((it, idx) => (
              <tr key={idx}>
                <td>{it.fecha}</td><td>{it.equipo}</td><td>{it.actividad}</td><td>{it.refacciones || ''}</td><td>{it.observaciones || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))
  }

  function downloadBitacora(b) {
    const tipo = (prompt('¿Descargar como PDF o Excel? (pdf / excel)') || '').toLowerCase()
    if (tipo === 'pdf') {
      const w = window.open('', '_blank')
      const html = `<h2>Bitácora #${b.id} - ${b.nombre}</h2>
        <div>Fecha: ${b.fecha}</div>
        <table border="1" style="margin-top:10px;border-collapse:collapse;width:100%">
          <thead><tr><th>Fecha</th><th>Equipo</th><th>Actividad</th><th>Refacciones</th><th>Observaciones</th></tr></thead>
          <tbody>
            ${(b.items || []).map(it => `<tr>
              <td>${it.fecha}</td><td>${it.equipo}</td><td>${it.actividad}</td><td>${it.refacciones || ''}</td><td>${it.observaciones || ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      w.document.write(html)
      w.document.close()
      w.print()
    } else if (tipo === 'excel') {
      const rows = [['Fecha','Equipo','Actividad','Refacciones','Observaciones'],
        ...(b.items || []).map(it => [it.fecha, it.equipo, it.actividad, it.refacciones || '', it.observaciones || ''])]
      const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${b.nombre}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

 const content = useMemo(() => {
  if (view === 'home') {
    return <HomeView inventario={inventario} bitacoras={bitacoras} onGoForm={() => setView('formulario')} onUpsertInventario={upsertInventario} />
  }
if (view === 'inventario') {
  return (
    <InventarioView
      inventario={inventario}
      onOpenDetail={openInventarioDetail}
      onDownload={downloadInventario}
      onUpsert={upsertInventario}
      onDelete={deleteInventario}
      onDeleteMany={deleteInventarioMany}
    />
  )

  }
  if (view === 'bitacora') {
    return <BitacoraView bitacoras={bitacoras} onNew={createNewBitacora} onOpen={openBitacoraDetail} onDownload={downloadBitacora} />
  }
  if (view === 'perfil') {
    return <PerfilUsuariosView />
  }
  return <FormularioView pendientes={pendientes} setPendientes={setPendientes} terminados={terminados} setTerminados={setTerminados} />
}, [view, inventario, bitacoras, pendientes, terminados])

  return (
    <>
      <Header view={view} setView={setView} onTrashClick={() => alert('Papelera (demo)')} onAddClick={() => setView('formulario')}/>

      <main className="container">
        {content}
        <div className="footer small muted">Aplicación React · Demo localStorage · Puedes conectar MySQL después.</div>
      </main>

      <Modal open={modal.open} title={modal.title} onClose={closeModal}>
        {modal.body}
      </Modal>
    </>
  )
}
