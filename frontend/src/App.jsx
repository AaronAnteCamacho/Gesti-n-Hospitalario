import React, { useMemo, useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import Modal from './components/Modal.jsx'
import { useLocalStorageState } from './components/useLocalStorageState.js'

import HomeView from './views/HomeView.jsx'
import InventarioView from './views/InventarioView.jsx'
import BitacoraView from './views/BitacoraView.jsx'
import FormularioView from './views/FormularioView.jsx'
import LoginView from './views/LoginView.jsx'
import PerfilUsuariosView from "./views/PerfilUsuariosView"
import { apiFetch } from "./services/api.js"

function isoDate() {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  // ✅ SIEMPRE iniciar en login
  const [view, setView] = useState('login')

  // Auth desde localStorage (lo que sea que guardes ahí)
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth') || "null")
    } catch {
      return null
    }
  })

  // Datos
  const [inventario, setInventario] = useState([])

  const [bitacoras, setBitacoras] = useLocalStorageState('bitacoras', [])
  const [formularios, setFormularios] = useLocalStorageState('formularios', [])
  const [pendientes, setPendientes] = useLocalStorageState('pendientes', [])
  const [terminados, setTerminados] = useLocalStorageState('terminados', [])

  // Modal
  const [modal, setModal] = useState({ open: false, title: '', body: null })
  function openModal(title, body) { setModal({ open: true, title, body }) }
  function closeModal() { setModal({ open: false, title: '', body: null }) }

  // ✅ Helpers inventario API
  async function loadInventario() {
    const r = await apiFetch("/api/equipos")
    const mapped = (r.data || []).map((x) => ({
      id_equipo: x.id_equipo,
      numero_inventario: x.numero_inventario,
      nombre: x.nombre_equipo,
      marca: x.marca,
      area: x.nombre_area,
      activo: x.activo ? 1 : 0,
    }))
    setInventario(mapped)
  }

  // Cargar inventario cuando haya sesión (si tu auth no usa token, con que exista basta)
  useEffect(() => {
    if (!auth) return
    loadInventario().catch((e) => console.error("ERROR loadInventario:", e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  // ✅ Demo seed para otras secciones (opcional)
  useEffect(() => {
    if (bitacoras.length === 0) {
      setBitacoras([
        {
          id: 1, nombre: 'Mantenimiento Octubre', fecha: '2025-10-01', items: [
            { fecha: '2025-10-01', equipo: 'Monitor', actividad: 'Revisión', refacciones: '', observaciones: 'OK' },
          ]
        }
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

  // Acciones inventario (demo)
  function upsertInventario(existing) {
    const initial = existing || { numero_inventario: '', nombre: '', marca: '', area: '', activo: 1 }
    let draft = { ...initial }

    openModal(existing ? 'Editar inventario' : 'Crear inventario', (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const inv = (draft.numero_inventario || '').trim()
          if (!inv) return alert('Ingrese número de inventario')

          setInventario((prev) => {
            const idx = prev.findIndex(x => String(x.numero_inventario) === inv)
            const record = { ...draft, numero_inventario: inv, id_equipo: draft.id_equipo || Date.now() }

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
        <div><label>Número de inventario</label><input defaultValue={draft.numero_inventario} onChange={(e) => draft.numero_inventario = e.target.value} /></div>
        <div><label>Equipo</label><input defaultValue={draft.nombre} onChange={(e) => draft.nombre = e.target.value} /></div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label>Marca</label><input defaultValue={draft.marca} onChange={(e) => draft.marca = e.target.value} /></div>
          <div style={{ flex: 1 }}><label>Área</label><input defaultValue={draft.area} onChange={(e) => draft.area = e.target.value} /></div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="nav-btn" onClick={closeModal}>Cancelar</button>
          <button type="submit" className="btn">{existing ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    ))
  }

  function openInventarioDetail(item) {
    openModal(`Inventario ${item.numero_inventario || item.id_equipo}`, (
      <div>
        <strong>{item.nombre || '—'}</strong><br />
        Marca: {item.marca || '—'}<br />
        Área: {item.area || '—'}<br />
        Estado: {item.activo ? 'Activado' : 'Desactivado'}<br />
      </div>
    ))
  }

  function deleteInventario(item) {
    const key = item?.id_equipo || item?.numero_inventario
    if (!key) return
    setInventario((prev) => prev.filter((x) => (x?.id_equipo || x?.numero_inventario) !== key))
    alert('Inventario eliminado.')
  }

  function deleteInventarioMany(keys) {
    const setKeys = new Set(keys || [])
    setInventario((prev) => prev.filter((x) => !setKeys.has(x?.id_equipo || x?.numero_inventario)))
    alert('Inventarios eliminados.')
  }

  function downloadInventario(item) {
    const tipo = (prompt('¿Descargar como PDF o Excel? (pdf / excel)') || '').toLowerCase()
    if (tipo === 'pdf') {
      const w = window.open('', '_blank')
      w.document.write(`<h2>Inventario ${item.numero_inventario || item.id_equipo}</h2>
        <p><strong>${item.nombre || ''}</strong></p>
        <p>Marca: ${item.marca || ''}</p>
        <p>Área: ${item.area || ''}</p>
        <p>Estado: ${item.activo ? 'Activado' : 'Desactivado'}</p>`)
      w.document.close()
      w.print()
      return
    }

    if (tipo === 'excel') {
      const rows = [['Inv', 'Equipo', 'Marca', 'Área', 'Estado'],
      [item.numero_inventario || item.id_equipo, item.nombre || '', item.marca || '', item.area || '', item.activo ? 'Activado' : 'Desactivado']]
      const csv = rows.map(r => r.map(x => `"${String(x).replaceAll('"', '""')}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventario_${item.numero_inventario || item.id_equipo}.csv`
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
      </div>
    ))
  }

  function downloadBitacora() { }

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

  // ✅ Render final: aquí ya puedes decidir
  if (view === 'login' || !auth) {
    return (
      <LoginView
        onLogin={() => {
          let nextAuth = null
          try { nextAuth = JSON.parse(localStorage.getItem('auth') || "null") } catch {}
          setAuth(nextAuth)
          setView('home')
        }}
      />
    )
  }

  return (
    <>
      <Header
        view={view}
        setView={setView}
        onTrashClick={() => alert('Papelera (demo)')}
        onAddClick={() => setView('formulario')}
      />

      <main className="container">
        {content}
        <div className="footer small muted">Aplicación React · Inventario cargado desde API.</div>
      </main>

      <Modal open={modal.open} title={modal.title} onClose={closeModal}>
        {modal.body}
      </Modal>
    </>
  )
}
