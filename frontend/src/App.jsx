import React, { useMemo, useState, useEffect, useRef } from 'react'
import Header from './components/Header.jsx'
import Modal from './components/Modal.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import UsersModal from './components/UsersModal.jsx'
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

  // ✅ Perfil / usuarios (modal al clickear avatar)
  const [userCenterOpen, setUserCenterOpen] = useState(false)
  const [userCenterTab, setUserCenterTab] = useState('me')

  // ✅ Notificaciones (solo Jefe)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const seenNotifIdsRef = useRef(new Set())
  
  //  Logout (cerrar sesión y regresar a login)
  function handleLogout() {
    try {
      localStorage.removeItem('auth')
      localStorage.removeItem('token')
    } catch {}
    setAuth(null)
    setUserCenterOpen(false)
    setNotifOpen(false)
    setView('login')
  }

  //  Click avatar: abrir modal en la pestaña correcta
  function handleAvatarClick(tab = 'me') {
    setUserCenterTab(tab)
    setUserCenterOpen(true)
  }


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

    // API simple para usar el sistema de Toasts desde cualquier componente
  const toast = {
    success: (message, opts = {}) => pushToast('success', message, opts),
    error: (message, opts = {}) => pushToast('error', message, opts),
    info: (message, opts = {}) => pushToast('info', message, opts),

    confirm: (message, opts = {}) =>
  new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const t = {
      id,
      type: "confirm",
      title: opts.title || "Confirmación",
      message,
      duration: 0, // ✅ NO autoclose
      actions: [
        { label: opts.cancelText || "Cancelar", value: false, variant: "ghost" },
        { label: opts.okText || "Aceptar", value: true, variant: "primary" },
      ],
      onResolve: resolve,
    }
    setToasts((prev) => [...prev, t])
  }),
  }

  function ToastViewport({ scope = "fixed" }) {
  // scope: "fixed" (global) | "modal" (dentro del modal)
  const scopeClass = scope === "modal" ? "toast-viewport--modal" : "toast-viewport--fixed";
  return (
    <div className={`toast-viewport top-right ${scopeClass}`} aria-live="polite" aria-relevant="additions">
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
          {t.type === "confirm" && Array.isArray(t.actions) && (
  <div className="toast__actions">
    {t.actions.map((a, idx) => (
      <button
        key={idx}
        className={`toast__btn ${a.variant === "primary" ? "toast__btn--primary" : "toast__btn--ghost"}`}
        onClick={() => {
          try { t.onResolve?.(a.value) } catch {}
          closeToast(t.id)
        }}
      >
        {a.label}
      </button>
    ))}
  </div>
)}
        </div>
      ))}
    </div>
  );
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

  // ✅ Cerrar panel de notificaciones al clickear fuera
  useEffect(() => {
    function onDocClick() {
      setNotifOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  async function loadNotifications({ silentToasts = false } = {}) {
    if (!auth || auth.rol !== 'jefe') return
    try {
      const r = await apiFetch('/api/notificaciones?unread=1&limit=30')
      const list = r.data || []
      setNotifications(list)
      setUnreadCount(list.length)

      if (!silentToasts) {
        // Mostrar toast solo para las nuevas
        for (const n of list.slice().reverse()) {
          if (!seenNotifIdsRef.current.has(n.id_notificacion)) {
            seenNotifIdsRef.current.add(n.id_notificacion)
            pushToast('info', n.mensaje, { title: 'Notificación' })
          }
        }
      } else {
        // En carga silenciosa, solo marcar como vistas para evitar spam inicial
        for (const n of list) seenNotifIdsRef.current.add(n.id_notificacion)
      }
    } catch (e) {
      // no rompemos UI
      console.warn('No se pudieron cargar notificaciones:', e?.message || e)
    }
  }

  // ✅ polling (solo jefe)
  useEffect(() => {
    if (!auth || auth.rol !== 'jefe') return
    loadNotifications({ silentToasts: true })
    const t = window.setInterval(() => loadNotifications({ silentToasts: false }), 8000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  async function markNotifRead(id) {
    try {
      await apiFetch(`/api/notificaciones/${id}/read`, { method: 'PATCH' })
      await loadNotifications({ silentToasts: true })
    } catch (e) {
      pushToast('error', e?.message || 'No se pudo marcar como leída')
    }
  }

  async function markAllNotifsRead() {
    try {
      await apiFetch('/api/notificaciones/read-all', { method: 'PATCH' })
      await loadNotifications({ silentToasts: true })
    } catch (e) {
      pushToast('error', e?.message || 'No se pudo marcar todo')
    }
  }

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

  
function downloadBitacora(b) {
  if (!b) return;

  // ✅ En lugar de prompt (texto), abrimos una ventana (Modal) con botones
  openModal('Descargar bitácora', (
    <div style={{ display: 'grid', gap: 12, minWidth: 280 }}>
      <div className="small muted">Elige el formato de descarga:</div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn"
          onClick={() => { closeModal(); downloadBitacoraFile(b, 'pdf'); }}
        >
          PDF
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => { closeModal(); downloadBitacoraFile(b, 'excel'); }}
        >
          Excel
        </button>
      </div>
    </div>
  ));
}


function downloadBitacoraFile(b, tipo) {
  if (!b) return;

  tipo = String(tipo || '').toLowerCase();
  if (tipo !== 'pdf' && tipo !== 'excel') return;

  const safe = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const rows = (b.items?.length ? b.items : []);

  const fecha = b.fecha || isoDate();
  const nombre = (b.nombre || 'BITÁCORA DE REVISIÓN').toUpperCase();
if (tipo === "excel") {
    // Cabecera + 2 filas de encabezado (tipo tu Excel)
    const out = [
      ['HOSPITAL DE ESPECIALIDADES "DR. ANTONIO GONZALEZ GUEVARA"'],
      ['AREA DE MANTENIMIENTO'],
      [nombre],
      ['FECHA: ' + fecha],
      [''],
      [
        "No. DE INVENTARIO",
        "EQUIPO MÉDICO",
        "MARCA",
        "MODELO",
        "NÚMERO DE SERIE",
        "UBICACIÓN ESPECÍFICA",
        "FUNCIONAMIENTO (CORRECTO)",
        "FUNCIONAMIENTO (INCORRECTO)",
        "SENSORES (CORRECTO)",
        "SENSORES (INCORRECTO)",
        "REQUIERE REPARACIÓN (SI)",
        "REQUIERE REPARACIÓN (NO)",
        "FECHA",
        "OBSERVACIONES",
      ],
      ...rows.map((r) => [
        r.numero_inventario || r.inventario || r.inv || "",
        r.equipo || r.nombre_equipo || r.nombre || "",
        r.marca || "",
        r.modelo || "",
        r.numero_serie || r.serie || "",
        r.ubicacion_especifica || r.ubicacion || "",
        r.funcionamiento_correcto ? "X" : "",
        r.funcionamiento_incorrecto ? "X" : "",
        r.sensores_correcto ? "X" : "",
        r.sensores_incorrecto ? "X" : "",
        r.requiere_reparacion_si ? "X" : "",
        r.requiere_reparacion_no ? "X" : "",
        fecha,
        r.observaciones || "",
      ]),
    ];

    const csv = out
      .map((rr) => rr.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitacora_${nombre.replaceAll(" ", "_")}_${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (tipo === "pdf") {
    const w = window.open("", "_blank");
    if (!w) return alert("Permite ventanas emergentes para imprimir.");

    const tableRows = rows
      .map(
        (r) => `
        <tr>
          <td>${safe(r.numero_inventario || r.inventario || r.inv)}</td>
          <td>${safe(r.equipo || r.nombre_equipo || r.nombre)}</td>
          <td>${safe(r.marca)}</td>
          <td>${safe(r.modelo)}</td>
          <td>${safe(r.numero_serie || r.serie)}</td>
          <td>${safe(r.ubicacion_especifica || r.ubicacion)}</td>
          <td class="c">${r.funcionamiento_correcto ? "X" : ""}</td>
          <td class="c">${r.funcionamiento_incorrecto ? "X" : ""}</td>
          <td class="c">${r.sensores_correcto ? "X" : ""}</td>
          <td class="c">${r.sensores_incorrecto ? "X" : ""}</td>
          <td class="c">${r.requiere_reparacion_si ? "X" : ""}</td>
          <td class="c">${r.requiere_reparacion_no ? "X" : ""}</td>
          <td>${safe(fecha)}</td>
          <td>${safe(r.observaciones || "")}</td>
        </tr>`
      )
      .join("");

    w.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${safe(nombre)}</title>
          <style>
            body{font-family:Arial,Helvetica,sans-serif;padding:18px;}
            .hdr{
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
}

.hdr-logo{
  width: 70px;
  height: auto;
  object-fit: contain;
  flex: 0 0 auto;
}

/* Solo el logo de la izquierda */
.hdr-logo-left{
  width: 95px; /* ajusta: 85, 90, 100... */
}

.hdr-center{
  flex: 1;
  text-align: center;
  padding: 0 12px;
}
            .t1{font-weight:800;font-size:14px;}
            .t2{font-weight:800;font-size:13px;margin-top:3px;}
            .t3{font-weight:900;font-size:14px;margin-top:6px;}
            .meta{text-align:left;max-width:980px;margin:10px auto 0;font-size:12px;}
            table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;}
            th,td{border:1px solid #333;padding:6px;vertical-align:top;}
            th{background:#f2f2f2}
            .c{text-align:center;font-weight:800}
          </style>
        </head>
        <body>
          <div class="hdr">
  <img class="hdr-logo hdr-logo-left" src="${logoLeft}" alt="Logo izquierda" />

  <div class="hdr-center">
    <div class="t1">HOSPITAL DE ESPECIALIDADES "DR. ANTONIO GONZALEZ GUEVARA"</div>
    <div class="t2">AREA DE MANTENIMIENTO</div>
    <div class="t3">${safe(nombre)}</div>
  </div>

  <img class="hdr-logo" src="${logoRight}" alt="Logo derecha" />
</div>
          <div class="meta">
            <div><b>Fecha:</b> ${safe(fecha)}</div>
            <div><b>Nº de artículos:</b> ${rows.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2">No. de inventario</th>
                <th rowspan="2">Equipo médico</th>
                <th rowspan="2">Marca</th>
                <th rowspan="2">Modelo</th>
                <th rowspan="2">Número de serie</th>
                <th rowspan="2">Ubicación específica</th>
                <th colspan="2">Funcionamiento</th>
                <th colspan="2">Sensores</th>
                <th colspan="2">Requiere reparación</th>
                <th rowspan="2">Fecha</th>
                <th rowspan="2">Observaciones</th>
              </tr>
              <tr>
                <th>Correcto</th><th>Incorrecto</th>
                <th>Correcto</th><th>Incorrecto</th>
                <th>Si</th><th>No</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="14">Sin registros para imprimir.</td></tr>`}
            </tbody>
          </table>

          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);

    w.document.close();
    return;
  }
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
      return <Bitacora bitacoras={bitacoras} onNew={createNewBitacora} onOpen={openBitacoraDetail} onDownload={downloadBitacora} />
    }
    if (view === 'perfil') {
      if (auth?.rol !== 'jefe') return <div className="card">No tienes permisos para ver usuarios.</div>
      return <PerfilUsuarios />
    }
    if (view === 'papelera') {
      return <Papelera auth={auth} onBack={() => setView('inventario')} onRestored={() => loadInventario()} />
    }
    return (
      <Formulario
        inventario={inventario}
        pendientes={pendientes}
        setPendientes={setPendientes}
        terminados={terminados}
        setTerminados={setTerminados}
      />
    )
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



  // ✅ Bitácora (vista completa dentro del modal, como en Hospital.zip)
  function BitacoraSheet({ bitacoraId }) {
      const b = bitacoras.find(x => x.id === bitacoraId)
      if (!b) return <div>No se encontró la bitácora.</div>

      const fmt = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v))

      const updateRow = (idx, patch) => {
        setBitacoras(prev => prev.map(bb => {
          if (bb.id !== b.id) return bb
          const items = (bb.items && bb.items.length) ? [...bb.items] : [{}]
          const nextRow = { ...(items[idx] || {}), ...patch }
          items[idx] = nextRow
          return { ...bb, items }
        }))
      }

      const rows = (b.items?.length ? b.items : [{}])

      return (
        <div className="bitacora-sheet">
          <div className="bitacora-head">
            <div className="bitacora-logos">
              <img src={logoLeft} alt="Logo" />
            </div>

            <div className="bitacora-title">
              <div className="t1">HOSPITAL DE ESPECIALIDADES "DR. ANTONIO GONZALEZ GUEVARA"</div>
              <div className="t2">AREA DE MANTENIMIENTO</div>
              <div className="t3">{(b.nombre || 'BITÁCORA DE REVISIÓN').toUpperCase()}</div>
            </div>

            <div className="bitacora-logos right">
              <img src={logoRight} alt="Logo" />
            </div>
          </div>

          <div className="small muted" style={{ marginTop: 8 }}>
            Fecha: <strong>{fmt(b.fecha)}</strong> · Nº de artículos: <strong>{rows.length}</strong>
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
                  <th colSpan={2} style={{ textAlign: 'center' }}>Funcionamiento</th>
                  <th colSpan={2} style={{ textAlign: 'center' }}>Sensores</th>
                  <th colSpan={2} style={{ textAlign: 'center' }}>Requiere reparación</th>
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
                {rows.map((cur, idx) => {
                  const row = cur || {}
                  const name = (suffix) => `${b.id}-${idx}-${suffix}`

                  return (
                    <tr key={idx}>
                      <td>{fmt(row.numero_inventario || row.inventario || row.inv)}</td>
                      <td>{fmt(row.equipo || row.nombre_equipo || row.nombre)}</td>
                      <td>{fmt(row.marca)}</td>
                      <td>{fmt(row.modelo)}</td>
                      <td>{fmt(row.numero_serie || row.serie)}</td>
                      <td>{fmt(row.ubicacion_especifica || row.ubicacion)}</td>

                      <td className="center">
                        <input
                          type="radio"
                          name={name('func')}
                          checked={!!row.funcionamiento_correcto}
                          onChange={() => updateRow(idx, { funcionamiento_correcto: true, funcionamiento_incorrecto: false })}
                        />
                      </td>
                      <td className="center">
                        <input
                          type="radio"
                          name={name('func')}
                          checked={!!row.funcionamiento_incorrecto}
                          onChange={() => updateRow(idx, { funcionamiento_correcto: false, funcionamiento_incorrecto: true })}
                        />
                      </td>

                      <td className="center">
                        <input
                          type="radio"
                          name={name('sens')}
                          checked={!!row.sensores_correcto}
                          onChange={() => updateRow(idx, { sensores_correcto: true, sensores_incorrecto: false })}
                        />
                      </td>
                      <td className="center">
                        <input
                          type="radio"
                          name={name('sens')}
                          checked={!!row.sensores_incorrecto}
                          onChange={() => updateRow(idx, { sensores_correcto: false, sensores_incorrecto: true })}
                        />
                      </td>

                      <td className="center">
                        <input
                          type="radio"
                          name={name('rep')}
                          checked={!!row.requiere_reparacion_si}
                          onChange={() => updateRow(idx, { requiere_reparacion_si: true, requiere_reparacion_no: false })}
                        />
                      </td>
                      <td className="center">
                        <input
                          type="radio"
                          name={name('rep')}
                          checked={!!row.requiere_reparacion_no}
                          onChange={() => updateRow(idx, { requiere_reparacion_si: false, requiere_reparacion_no: true })}
                        />
                      </td>

                      {/* ✅ Fecha: misma que fecha de creación de bitácora */}
                      <td>{fmt(b.fecha)}</td>

                      <td>
                        {/* ✅ Observaciones editable */}
                        <input
                          className="bitacora-obs"
                          value={row.observaciones || ''}
                          onChange={(e) => updateRow(idx, { observaciones: e.target.value })}
                          placeholder="Escribe observaciones..."
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => window.print()}>Imprimir</button>
          </div>
        </div>
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

      {/* Solo global cuando NO hay ningún modal */}
      {!modal.open && !userCenterOpen && <ToastViewport scope="fixed" />}

      <Header
        view={view}
        setView={setView}
        auth={auth}
        onAvatarClick={handleAvatarClick}
        onLogout={handleLogout}
        notifications={notifications}
        unreadCount={unreadCount}
        notifOpen={notifOpen}
        onToggleNotifs={() => setNotifOpen((v) => !v)}
        onMarkNotifRead={markNotifRead}
        onMarkAllNotifsRead={markAllNotifsRead}
        onTrashClick={() => setView('papelera')}
        onAddClick={() => {
          setView('inventario')
          upsertInventario(null)
        }}
      />

     <ProfileModal
  open={userCenterOpen && userCenterTab === 'me'}
  onClose={() => setUserCenterOpen(false)}
  auth={auth}
  onAuthUpdate={(next) => setAuth(next)}
  toast={toast}
  ToastViewport={ToastViewport}
/>

<UsersModal
  open={userCenterOpen && userCenterTab === 'users'}
  onClose={() => setUserCenterOpen(false)}
  auth={auth}
  toast={toast}
  ToastViewport={ToastViewport}
/>

      <main className="container">
        {content}
        <div className="footer small muted">Aplicación React · Inventario cargado desde API.</div>
      </main>

      <Modal open={modal.open} title={modal.title} onClose={closeModal}>
        {/*Cuando hay modal: toast DENTRO del modal*/}
        {modal.open && <ToastViewport scope="modal" />}

        {modal.kind === 'bitacora'
          ? <BitacoraSheet bitacoraId={modal.bitacoraId} />
          : modal.body}
      </Modal>
    </>
  )
}
