import React, { useMemo, useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import Modal from './components/Modal.jsx'
import { useLocalStorageState } from './components/useLocalStorageState.js'

import Home from './views/Home.jsx'
import Inventario from './views/Inventario.jsx'
import Bitacora from './views/Bitacora.jsx'
import Formulario from './views/Formulario.jsx'
import Login from './views/Login.jsx'
import PerfilUsuarios from "./views/PerfilUsuarios.jsx"
import Papelera from './views/Papelera.jsx'

import { apiFetch } from "./services/api.js"
import logoLeft from './assets/logo_left.png'
import logoRight from './assets/logo_right.png'

function isoDate() {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const [view, setView] = useState('login')

  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth') || "null")
    } catch {
      return null
    }
  })

  const [inventario, setInventario] = useState([])
  const [areas, setAreas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [bitacoras, setBitacoras] = useLocalStorageState('bitacoras', [])
  const [formularios, setFormularios] = useLocalStorageState('formularios', [])
  const [pendientes, setPendientes] = useLocalStorageState('pendientes', [])
  const [terminados, setTerminados] = useLocalStorageState('terminados', [])

  const [modal, setModal] = useState({
    open: false,
    title: '',
    kind: null,
    bitacoraId: null,
    body: null
  })


  // TOAST (GLOBAL y MODAL-SCOPE)
  const [toasts, setToasts] = useState([])

  function closeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  function pushToast(type, message, opts = {}) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const title =
      opts.title ||
      (type === 'success' ? 'Notificación' : type === 'error' ? 'Notificación' : 'Notificación')

    const duration = typeof opts.duration === 'number'
      ? opts.duration
      : (type === 'error' ? 3500 : 2200)

    const t = { id, type, title, message, duration }
    setToasts((prev) => [...prev, t])

    window.setTimeout(() => closeToast(id), duration)
    return id
  }

  function ToastViewport({ scope = "fixed" }) {
    // scope: "fixed" (arriba-derecha global) | "modal" (dentro del modal)
    return (
      <div className={`toast-viewport ${scope === "modal" ? "toast-viewport--modal" : "toast-viewport--fixed"}`} aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === "error" ? "alert" : "status"}>
            <div className="toast__bar" />
            <div className="toast__head">
              <div className="toast__title">{t.title}</div>
              <button className="toast__close" onClick={() => closeToast(t.id)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="toast__msg">{t.message}</div>
          </div>
        ))}
      </div>
    )
  }

  

  function openModal(title, body) {
    console.log("ABRIENDO MODAL ✅")
    setModal({ open: true, title, kind: null, bitacoraId: null, body })
  }

  function openBitacoraModal(bitacoraId) {
    setModal({ open: true, title: `Bitácora #${bitacoraId}`, kind: 'bitacora', bitacoraId, body: null })
  }

  function closeModal() {
    setModal({ open: false, title: '', kind: null, bitacoraId: null, body: null })
  }

  async function loadInventario() {
    const r = await apiFetch("/api/equipos")
    setInventario(r.data || [])
  }

  async function loadCatalogos() {
    const [a, c] = await Promise.all([
      apiFetch("/api/areas"),
      apiFetch("/api/categorias"),
    ])
    setAreas(a.data || [])
    setCategorias(c.data || [])
  }

  useEffect(() => {
    if (!auth) return
    loadInventario().catch((e) => console.error("ERROR loadInventario:", e))
    loadCatalogos().catch((e) => console.error("ERROR loadCatalogos:", e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  useEffect(() => {
    if (bitacoras.length === 0) {
      setBitacoras([
        {
          id: 1,
          nombre: 'Bitácora Neonatología',
          fecha: isoDate(),
          items: [
            {
              numero_inventario: '192504',
              equipo: 'CARRO ROJO CON EQUIPO COMPLETO PARA REANIMACION',
              marca: 'MEDTRONIC',
              modelo: 'LIFEPAK 20',
              numero_serie: '40641114',
              ubicacion_especifica: 'NEONATOLOGÍA',
              funcionamiento_correcto: false,
              funcionamiento_incorrecto: false,
              sensores_correcto: false,
              sensores_incorrecto: false,
              requiere_reparacion_si: false,
              requiere_reparacion_no: false,
              observaciones: ''
            }
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

  function upsertInventario(existing, opts = {}) {
    const initial = existing || {
      numero_inventario: "",
      nombre_equipo: "",
      marca: "",
      modelo: "",
      numero_serie: "",
      ubicacion_especifica: "",
      id_categoria: "",
      id_area: "",
      activo: 1,
    }
    const prefill = opts?.prefill && typeof opts.prefill === 'object' ? opts.prefill : null
    const merged = prefill ? { ...initial, ...prefill } : initial
    let draft = { ...merged }

    const isEdit = !!existing?.id_equipo

    openModal(isEdit ? `Editar equipo #${existing.id_equipo}` : "Agregar equipo", (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            const inv = String(draft.numero_inventario || "").trim()
            const nom = String(draft.nombre_equipo || "").trim()
            const ser = String(draft.numero_serie || "").trim()

            if (!inv) return pushToast("error", "El número de inventario es obligatorio.")
            if (!nom) return pushToast("error", "El nombre del equipo es obligatorio.")
            if (!ser) return pushToast("error", "El número de serie es obligatorio.")
            if (!draft.id_categoria) return pushToast("error", "Selecciona una categoría.")
            if (!draft.id_area) return pushToast("error", "Selecciona un área.")

            // Duplicado en FRONT (solo al agregar, para respuesta inmediata)
            if (!isEdit) {
              const exists = (inventario || []).some((x) =>
                String(x?.numero_inventario || "").trim().toLowerCase() === inv.toLowerCase()
              )
              if (exists) return pushToast("error", `El No. inventario "${inv}" ya existe.`)
            }

            const body = {
              numero_inventario: inv,
              nombre_equipo: nom,
              marca: String(draft.marca || "").trim(),
              modelo: String(draft.modelo || "").trim(),
              numero_serie: ser,
              ubicacion_especifica: String(draft.ubicacion_especifica || "").trim(),
              id_categoria: Number(draft.id_categoria),
              id_area: Number(draft.id_area),
              activo: draft.activo ? 1 : 0,
            }

            let resp = null
            if (isEdit) {
              resp = await apiFetch(`/api/equipos/${existing.id_equipo}`, {
                method: "PUT",
                body: JSON.stringify(body),
              })
            } else {
              resp = await apiFetch(`/api/equipos`, {
                method: "POST",
                body: JSON.stringify(body),
              })
            }

            await loadInventario()

            if (typeof opts.afterSave === 'function') {
              const idFromResp = resp?.data?.id_equipo
              const saved = {
                id_equipo: existing?.id_equipo || idFromResp,
                ...body,
              }
              try { await opts.afterSave(saved) } catch {}
            }

            closeModal()
            pushToast("success", isEdit ? "Equipo actualizado." : "Equipo agregado.")
          } catch (err) {
            const msg = String(err?.message || "Error al guardar")
            const low = msg.toLowerCase()

            const isDuplicate =
              low.includes("duplicate") ||
              low.includes("duplic") ||
              low.includes("unique") ||
              low.includes("constraint") ||
              low.includes("violat") ||
              low.includes("ya existe")

            if (isDuplicate) {
              const inv = String(draft.numero_inventario || "").trim()
              pushToast("error", `El No. inventario "${inv}" ya existe.`)
            } else {
              pushToast("error", msg)
            }
          }
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Número de inventario</label>
            <input defaultValue={draft.numero_inventario} onChange={(e) => (draft.numero_inventario = e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Estado</label>
            <select defaultValue={draft.activo ? '1' : '0'} onChange={(e) => (draft.activo = e.target.value === '1')}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>

        <div>
          <label>Nombre del equipo</label>
          <input defaultValue={draft.nombre_equipo} onChange={(e) => (draft.nombre_equipo = e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Marca</label>
            <input defaultValue={draft.marca} onChange={(e) => (draft.marca = e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Modelo</label>
            <input defaultValue={draft.modelo} onChange={(e) => (draft.modelo = e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Número de serie</label>
            <input defaultValue={draft.numero_serie} onChange={(e) => (draft.numero_serie = e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Ubicación específica</label>
            <input defaultValue={draft.ubicacion_especifica} onChange={(e) => (draft.ubicacion_especifica = e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Categoría</label>
            <select defaultValue={draft.id_categoria || ''} onChange={(e) => (draft.id_categoria = e.target.value)}>
              <option value="">-- Selecciona --</option>
              {categorias.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Área</label>
            <select defaultValue={draft.id_area || ''} onChange={(e) => (draft.id_area = e.target.value)}>
              <option value="">-- Selecciona --</option>
              {areas.map((a) => (
                <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="nav-btn" onClick={closeModal}>Cancelar</button>
          <button type="submit" className="btn">Guardar</button>
        </div>
      </form>
    ))
  }

  function openInventarioDetail(item) {
    openModal(`Equipo ${item.numero_inventario || item.id_equipo}`, (
      <div>
        <div><strong>{item.nombre_equipo || '—'}</strong></div>
        <div className="small muted" style={{ marginTop: 6 }}>
          ID: {item.id_equipo} · Activo: {item.activo ? 'Sí' : 'No'}
        </div>
        <div style={{ marginTop: 10 }}>
          <div>Inventario: {item.numero_inventario || '—'}</div>
          <div>Marca: {item.marca || '—'}</div>
          <div>Modelo: {item.modelo || '—'}</div>
          <div>Serie: {item.numero_serie || '—'}</div>
          <div>Ubicación: {item.ubicacion_especifica || '—'}</div>
          <div>Categoría: {item.nombre_categoria || item.id_categoria || '—'}</div>
          <div>Área: {item.nombre_area || item.id_area || '—'}</div>
        </div>
      </div>
    ))
  }

  function addToPendientes(equipo, falla) {
    const inv = equipo?.numero_inventario || ''
    const serie = equipo?.numero_serie || 'S/N'
    const nombre = equipo?.nombre_equipo || 'Equipo'
    const area = equipo?.nombre_area || equipo?.id_area || '—'
    const fecha = isoDate()
    const reporto = auth?.nombre || auth?.correo || '—'

    setPendientes((prev) => {
      const exists = (prev || []).some((p) => String(p.inventario) === String(inv) && String(p.fecha) === String(fecha))
      if (exists) return prev
      return [
        { serie, nombre, fecha, area, inventario: inv, reporto, falla },
        ...(prev || []),
      ]
    })
  }

  function addToBitacoras(equipo, falla) {
    const fecha = isoDate()
    const item = {
      numero_inventario: equipo?.numero_inventario,
      equipo: equipo?.nombre_equipo,
      marca: equipo?.marca,
      modelo: equipo?.modelo,
      numero_serie: equipo?.numero_serie,
      ubicacion_especifica: equipo?.ubicacion_especifica,
      funcionamiento_correcto: !!falla.funcionamiento_correcto,
      funcionamiento_incorrecto: !!falla.funcionamiento_incorrecto,
      sensores_correcto: !!falla.sensores_correcto,
      sensores_incorrecto: !!falla.sensores_incorrecto,
      requiere_reparacion_si: !!falla.requiere_reparacion_si,
      requiere_reparacion_no: !!falla.requiere_reparacion_no,
      observaciones: falla.observaciones || '',
    }

    setBitacoras((prev) => {
      const list = Array.isArray(prev) ? [...prev] : []
      const idx = list.findIndex((b) => String(b.fecha) === String(fecha))

      if (idx >= 0) {
        const b = list[idx]
        const items = Array.isArray(b.items) ? [...b.items] : []
        items.push(item)
        list[idx] = { ...b, items }
        return list
      }

      return [
        { id: Date.now(), nombre: `Bitácora ${fecha}`, fecha, items: [item] },
        ...list,
      ]
    })
  }

  function ReportFallaSheet({ equipo, onCancel, onSave }) {
    const [fallo, setFallo] = useState({
      funcionamiento_correcto: false,
      funcionamiento_incorrecto: false,
      sensores_correcto: false,
      sensores_incorrecto: false,
      requiere_reparacion_si: false,
      requiere_reparacion_no: false,
      observaciones: "",
    })

    const fecha = isoDate()

    const fmt = (v) => String(v ?? "").trim() || "—"

    function setRadio(group, value) {
      if (group === "func") {
        setFallo((p) => ({
          ...p,
          funcionamiento_correcto: value === "correcto",
          funcionamiento_incorrecto: value === "incorrecto",
        }))
      }
      if (group === "sens") {
        setFallo((p) => ({
          ...p,
          sensores_correcto: value === "correcto",
          sensores_incorrecto: value === "incorrecto",
        }))
      }
      if (group === "rep") {
        setFallo((p) => ({
          ...p,
          requiere_reparacion_si: value === "si",
          requiere_reparacion_no: value === "no",
        }))
      }
    }

    return (
      <div className="bitacora-sheet">
        <div className="bitacora-head">
          <div className="bitacora-logos">
            <img src={logoLeft} alt="Logo" />
          </div>

          <div className="bitacora-title">
            <div className="t1">HOSPITAL DE ESPECIALIDADES "DR. ANTONIO GONZALEZ GUEVARA"</div>
            <div className="t2">AREA DE MANTENIMIENTO</div>
            <div className="t3">REPORTE DE FALLA</div>
          </div>

          <div className="bitacora-logos right">
            <img src={logoRight} alt="Logo" />
          </div>
        </div>

        <div className="small muted" style={{ marginTop: 8 }}>
          Fecha: <strong>{fecha}</strong>
        </div>

        <div className="bitacora-table-wrap">
          <table className="bitacora-table">
            <thead>
              <tr>
                <th rowSpan={2}>No. de inventario</th>
                <th rowSpan={2}>Equipo médico</th>
                <th rowSpan={2}>Marca</th>
                <th rowSpan={2}>Modelo</th>
                <th rowSpan={2}>Número de serie</th>
                <th rowSpan={2}>Ubicación específica</th>
                <th colSpan={2} style={{ textAlign: "center" }}>Funcionamiento</th>
                <th colSpan={2} style={{ textAlign: "center" }}>Sensores</th>
                <th colSpan={2} style={{ textAlign: "center" }}>Requiere reparación</th>
                <th rowSpan={2}>Fecha</th>
                <th rowSpan={2}>Observaciones</th>
              </tr>
              <tr>
                <th className="center">Correcto</th>
                <th className="center">Incorrecto</th>
                <th className="center">Correcto</th>
                <th className="center">Incorrecto</th>
                <th className="center">Sí</th>
                <th className="center">No</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>{fmt(equipo?.numero_inventario)}</td>
                <td>{fmt(equipo?.nombre_equipo)}</td>
                <td>{fmt(equipo?.marca)}</td>
                <td>{fmt(equipo?.modelo)}</td>
                <td>{fmt(equipo?.numero_serie)}</td>
                <td>{fmt(equipo?.ubicacion_especifica)}</td>

                <td className="center">
                  <input type="radio" name="rf-func" checked={!!fallo.funcionamiento_correcto} onChange={() => setRadio("func", "correcto")} />
                </td>
                <td className="center">
                  <input type="radio" name="rf-func" checked={!!fallo.funcionamiento_incorrecto} onChange={() => setRadio("func", "incorrecto")} />
                </td>

                <td className="center">
                  <input type="radio" name="rf-sens" checked={!!fallo.sensores_correcto} onChange={() => setRadio("sens", "correcto")} />
                </td>
                <td className="center">
                  <input type="radio" name="rf-sens" checked={!!fallo.sensores_incorrecto} onChange={() => setRadio("sens", "incorrecto")} />
                </td>

                <td className="center">
                  <input type="radio" name="rf-rep" checked={!!fallo.requiere_reparacion_si} onChange={() => setRadio("rep", "si")} />
                </td>
                <td className="center">
                  <input type="radio" name="rf-rep" checked={!!fallo.requiere_reparacion_no} onChange={() => setRadio("rep", "no")} />
                </td>

                <td>{fecha}</td>

                <td>
                  <input
                    className="bitacora-obs"
                    value={fallo.observaciones}
                    onChange={(e) => setFallo((p) => ({ ...p, observaciones: e.target.value }))}
                    placeholder="Escribe observaciones..."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="nav-btn" onClick={onCancel}>Cancelar</button>
          <button
            className="btn"
            onClick={() => {
              if (!fallo.funcionamiento_correcto && !fallo.funcionamiento_incorrecto) return pushToast("error", "Selecciona el funcionamiento")
              if (!fallo.sensores_correcto && !fallo.sensores_incorrecto) return pushToast("error", "Selecciona sensores")
              if (!fallo.requiere_reparacion_si && !fallo.requiere_reparacion_no) return pushToast("error", "Indica si requiere reparación")
              onSave(fallo)
            }}
          >
            Guardar y enviar
          </button>
        </div>
      </div>
    )
  }

  function openReportFallaModal(equipo) {
    const eq = equipo || {}
    openModal(`Reporte de falla · ${eq.numero_inventario || eq.numero_serie || 'Equipo'}`, (
      <ReportFallaSheet
        equipo={eq}
        onCancel={closeModal}
        onSave={(fallo) => {
          addToBitacoras(eq, fallo)
          addToPendientes(eq, fallo)
          closeModal()
          setView('bitacora')
          pushToast('success', 'Falla registrada. Se agregó a Bitácoras y Pendientes.')
        }}
      />
    ))
  }

  function quickCreateFromQuery(q) {
    const t = String(q || '').trim()
    if (!t) return
    const prefill = { numero_inventario: t }
    upsertInventario(null, {
      prefill,
      afterSave: (saved) => {
        if (saved) openReportFallaModal(saved)
        else pushToast('error', 'Equipo guardado, pero no se pudo abrir el reporte. Recarga e intenta nuevamente.')
      },
    })
  }

  //  Papelera
  function trashInventario(item) {
    if (!item?.id_equipo) return
    let motivo = ""

    openModal(`Borrar equipo ${item.numero_inventario || item.id_equipo}`, (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          motivo = String(motivo || '').trim()
          if (!motivo) return pushToast('error', 'Escribe el motivo')

          try {
            await apiFetch(`/api/equipos/${item.id_equipo}/trash`, {
              method: 'POST',
              body: JSON.stringify({ motivo }),
            })
            await loadInventario()
            closeModal()
            pushToast('success', 'Enviado a papelera.')
          } catch (err) {
            pushToast('error', err?.message || 'Error al enviar a papelera')
          }
        }}
      >
        <div className="small muted">Esto no borra definitivo: se mueve a la papelera.</div>
        <div style={{ marginTop: 10 }}>
          <label>Motivo</label>
          <input placeholder="Ej. Equipo dado de baja, duplicado, etc." onChange={(e) => (motivo = e.target.value)} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="nav-btn" onClick={closeModal}>Cancelar</button>
          <button type="submit" className="btn" style={{ background: '#b91c1c' }}>Enviar a papelera</button>
        </div>
      </form>
    ))
  }

  function createNewBitacora() {
    const nombre = prompt('Nombre de la bitácora:')
    if (!nombre) return
    setBitacoras(prev => [{ id: Date.now(), nombre, fecha: isoDate(), items: [] }, ...prev])
  }

  function openBitacoraDetail(b) {
    openBitacoraModal(b.id)
  }

  const content = useMemo(() => {
    if (view === 'home') {
      return (
        <Home
          inventario={inventario}
          bitacoras={bitacoras}
          onGoForm={() => setView('formulario')}
          onReportFalla={(eq) => openReportFallaModal(eq)}
          onQuickCreate={quickCreateFromQuery}
        />
      )
    }
    if (view === 'inventario') {
      return (
        <Inventario
          auth={auth}
          inventario={inventario}
          areas={areas}
          categorias={categorias}
          onAdd={() => { console.log("onAdd en App "); upsertInventario(null) }}
          onEdit={(it) => upsertInventario(it)}
          onTrash={(it) => trashInventario(it)}
          onReportFalla={(it) => openReportFallaModal(it)}
          onOpenDetail={openInventarioDetail}
          onReload={loadInventario}
        />
      )
    }
    if (view === 'bitacora') {
      return <Bitacora bitacoras={bitacoras} onNew={createNewBitacora} onOpen={openBitacoraDetail} />
    }
    if (view === 'perfil') {
      if (auth?.rol !== 'jefe') return <div className="card">No tienes permisos para ver usuarios.</div>
      return <PerfilUsuarios />
    }
    if (view === 'papelera') {
      return <Papelera auth={auth} onBack={() => setView('inventario')} onRestored={() => loadInventario()} />
    }
    return <Formulario pendientes={pendientes} setPendientes={setPendientes} terminados={terminados} setTerminados={setTerminados} />
  }, [view, auth, inventario, areas, categorias, bitacoras, pendientes, terminados])

  if (view === 'login' || !auth) {
    return (
      <Login
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
      {/*CSS del toast (estilo notificación) */}
      <style>{`
        .toast-viewport{
          width: min(360px, calc(100vw - 24px));
          display: grid;
          gap: 10px;
          padding: 12px;
          pointer-events: none;
          z-index: 9999;
        }
        .toast-viewport--fixed{
          position: fixed;
          top: 10px;
          right: 10px;
        }
        /* Cuando el modal está abierto, lo “anclamos” dentro del modal */
        .toast-viewport--modal{
          position: absolute;
          top: 10px;
          right: 10px;
        }

        .toast{
          pointer-events: auto;
          border-radius: 3px;
          background: #fff;
          box-shadow: 0 10px 26px rgba(0,0,0,.20);
          overflow: hidden;
          border: 1px solid rgba(0,0,0,.08);
          transform-origin: top right;
          animation: toastIn .12s ease-out;
        }
        @keyframes toastIn{
          from{ transform: translateY(-6px); opacity: 0; }
          to{ transform: translateY(0); opacity: 1; }
        }
        .toast__bar{ height: 10px; }
        .toast__head{
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px 2px;
          color: #fff;
        }
        .toast__title{ font-weight: 700; font-size: 12px; }
        .toast__msg{ padding: 6px 10px 10px; font-size: 12px; color: #2b2b2b; }
        .toast__close{
          border: 0; background: transparent; color: rgba(255,255,255,.9);
          font-size: 16px; cursor: pointer; line-height: 1;
        }
        .toast--success .toast__bar, .toast--success .toast__head{ background: #0b6b43; }
        .toast--error .toast__bar, .toast--error .toast__head{ background: #c81e1e; }
        .toast--info .toast__bar, .toast--info .toast__head{ background: #2563eb; }
      `}</style>

      {/*Cuando NO hay modal: toast global arriba a la derecha */}
      {!modal.open && <ToastViewport scope="fixed" />}

      <Header
        view={view}
        setView={setView}
        auth={auth}
        onTrashClick={() => setView('papelera')}
        onAddClick={() => {
          setView('inventario')
          upsertInventario(null)
        }}
      />

      <main className="container">
        {content}
        <div className="footer small muted">Aplicación React · Inventario cargado desde API.</div>
      </main>

      <Modal open={modal.open} title={modal.title} onClose={closeModal}>
        {/*Cuando hay modal: toast DENTRO del modal*/}
        {modal.open && <ToastViewport scope="modal" />}

        {modal.kind === 'bitacora'
          ? <div />
          : modal.body}
      </Modal>
    </>
  )
}
