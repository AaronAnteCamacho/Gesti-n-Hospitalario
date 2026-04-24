import { exportBitacoraPdf } from "./utils/pdfExport.js";
import { exportBitacoraExcel } from "./utils/excelExport.js";

import React, { useMemo, useState, useEffect, useRef } from 'react'
import Header from './components/Header.jsx'
import Modal from './components/Modal.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import UsersModal from './components/UsersModal.jsx'
import Home from './views/Home.jsx'
import Inventario from './views/Inventario.jsx'
import Bitacora from './views/Bitacora.jsx'
import Formulario from './views/Formulario.jsx'
import Login from './views/Login.jsx'
import PerfilUsuarios from "./views/PerfilUsuarios.jsx"
import Papelera from './views/Papelera.jsx'
import "./styles/Toast.css";
import { apiFetch } from "./services/api.js"
import logoLeft from './assets/logo_left.png'
import logoRight from './assets/logo_right.png'
import ResetPasswordView from "./views/ResetPasswordView.jsx";

function isoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mazatlan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function App() {
  const [view, setView] = useState(() => {
  const p = window.location.pathname || "/";
  if (p.startsWith("/reset-password")) return "reset-password";
  return "login";
});
 

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
  const [bitacoras, setBitacoras] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [terminados, setTerminados] = useState([])
  const [bitacoraRefreshKey, setBitacoraRefreshKey] = useState(0)

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

    // ✅ confirm con variantes (primary / danger) y Promise
    confirm: (message, opts = {}) =>
      new Promise((resolve) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`

        const okVariant = opts.okVariant || 'primary'
        const cancelVariant = opts.cancelVariant || 'ghost'

        const t = {
          id,
          type: 'confirm',
          title: opts.title || 'Confirmación',
          message,
          duration: 0, // ✅ NO autoclose
          actions: [
            { label: opts.cancelText || 'Cancelar', value: false, variant: cancelVariant },
            { label: opts.okText || 'Aceptar', value: true, variant: okVariant },
          ],
          // 👇 pinta franja/encabezado del confirm
          confirmVariant: okVariant === 'danger' ? 'danger' : 'primary',
          onResolve: resolve,
        }

        setToasts((prev) => [...prev, t])
      }),
  }

function ToastViewport({ scope = 'fixed' }) {
  // scope: "fixed" (global) | "modal" (dentro del modal)
  const scopeClass = scope === 'modal' ? 'toast-viewport--modal' : 'toast-viewport--fixed'

  function closeX(t) {
    // si era confirmación y cierran con X, resolvemos como "false"
    if (t.type === 'confirm' && typeof t.onResolve === 'function') {
      try { t.onResolve(false) } catch {}
    }
    closeToast(t.id)
  }

  function action(t, value) {
    if (typeof t.onResolve === 'function') {
      try { t.onResolve(value) } catch {}
    }
    closeToast(t.id)
  }

  return (
    <div
      className={`toast-viewport ${scopeClass}`}
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => {
        const confirmVariantClass =
          t.type === 'confirm' && t.confirmVariant ? `toast--confirm-${t.confirmVariant}` : ''

        return (
          <div
            key={t.id}
            className={`toast toast--${t.type} ${confirmVariantClass}`}
            role={t.type === 'error' ? 'alert' : 'status'}
          >
            <div className="toast__bar" />

            <div className="toast__head">
              <div className="toast__title">{t.title}</div>
              <button
                className="toast__close"
                onClick={() => closeX(t)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="toast__msg">{t.message}</div>

            {t.type === 'confirm' && Array.isArray(t.actions) && (
              <div className="toast__actions">
                {t.actions.map((a, idx) => (
                  <button
                    key={idx}
                    className={`toast__btn toast__btn--${a.variant || 'ghost'}`}
                    onClick={() => action(t, a.value)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
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
  try {
    const r = await apiFetch("/api/equipos");
    setInventario(r.data || []);
  } catch (e) {
    const msg = String(e?.message || "").toLowerCase();

    if (
      msg.includes("token inválido") ||
      msg.includes("token invalido") ||
      msg.includes("unauthorized") ||
      msg.includes("401")
    ) {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
      setAuth(null);
      setView("login");
      return;
    }

    throw e;
  }
}

async function loadCatalogos() {
  try {
    const [a, c] = await Promise.all([
      apiFetch("/api/areas"),
      apiFetch("/api/categorias"),
    ]);

    setAreas(a.data || []);
    setCategorias(c.data || []);
  } catch (e) {
    const msg = String(e?.message || "").toLowerCase();

    if (
      msg.includes("token inválido") ||
      msg.includes("token invalido") ||
      msg.includes("unauthorized") ||
      msg.includes("401")
    ) {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
      setAuth(null);
      setView("login");
      return;
    }

    throw e;
  }
}

async function loadBitacoras() {
  try {
    const r = await apiFetch("/api/bitacoras");
    const withFecha = r?.data?.withFecha || [];
    const sinFecha = r?.data?.sinFecha || [];
    setBitacoras([...(withFecha || []), ...(sinFecha || [])]);
  } catch (e) {
    const msg = String(e?.message || "").toLowerCase();

    if (
      msg.includes("token inválido") ||
      msg.includes("token invalido") ||
      msg.includes("unauthorized") ||
      msg.includes("401")
    ) {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
      setAuth(null);
      setView("login");
      return;
    }

    throw e;
  }
}
async function loadFormularios() {
  try {
    const r = await apiFetch("/api/formularios");
    setPendientes(r?.data?.pendientes || []);
    setTerminados(r?.data?.terminados || []);
  } catch (e) {
    const msg = String(e?.message || "").toLowerCase();

    if (
      msg.includes("token inválido") ||
      msg.includes("token invalido") ||
      msg.includes("unauthorized") ||
      msg.includes("401")
    ) {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
      setAuth(null);
      setView("login");
      return;
    }

    throw e;
  }
}

async function fetchBitacoraSheet(bitacoraLike) {
  const fechaKey = encodeURIComponent(bitacoraLike?.fecha || bitacoraLike?.id || bitacoraLike || "");
  if (!fechaKey) throw new Error("Bitácora inválida");
  const r = await apiFetch(`/api/bitacoras/sheet?fecha=${fechaKey}`);
  return r?.data || null;
}

 useEffect(() => {
  if (!auth) return;
  if (view === "login" || view === "reset-password") return;

  loadInventario().catch((e) => console.error("ERROR loadInventario:", e));
  loadCatalogos().catch((e) => console.error("ERROR loadCatalogos:", e));
  loadBitacoras().catch((e) => console.error("ERROR loadBitacoras:", e));
}, [auth]);

  useEffect(() => {
    function onDocClick() {
      setNotifOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  useEffect(() => {
    if (!auth) return;

    const isJefe = auth?.rol === "jefe";
    if (!isJefe && view === "formulario") {
      setView("home");
      pushToast("error", "No tienes permisos para acceder a Orden de Servicio.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, view]);

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

  // polling (solo jefe)
useEffect(() => {
  if (!auth || auth.rol !== "jefe") return;
  if (view === "login" || view === "reset-password") return;
  if (modal.open) return;

  loadNotifications({ silentToasts: true });

  const t = window.setInterval(() => {
    if (!modal.open) {
      loadNotifications({ silentToasts: false });
    }
  }, 8000);

  return () => window.clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [auth, view, modal.open]);

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

  function buildFallaReportada(falla) {
  const partes = [];

  partes.push(
    falla?.funcionamiento_incorrecto
      ? "Funcionamiento incorrecto"
      : "Funcionamiento correcto"
  );

  partes.push(
    falla?.sensores_incorrecto
      ? "Sensores incorrectos"
      : "Sensores correctos"
  );

  partes.push(
    falla?.requiere_reparacion_si
      ? "Requiere reparación"
      : "No requiere reparación"
  );

  return partes.join(". ");
}

async function addToFormularioPendiente(equipo, falla) {
  const idEquipo = Number(equipo?.id_equipo);
  if (!idEquipo) throw new Error("El equipo no tiene id_equipo para guardar el formulario.");

  await apiFetch("/api/formularios/pending", {
    method: "POST",
    body: JSON.stringify({
      id_equipo: idEquipo,
      fecha: isoDate(),
      area_servicio: equipo?.nombre_area || null,
      falla_reportada: buildFallaReportada(falla),
      observaciones: falla?.observaciones || "",
    }),
  });

  await loadFormularios();
}

  async function addToBitacoras(equipo, falla) {
    const idEquipo = Number(equipo?.id_equipo)
    if (!idEquipo) throw new Error('El equipo no tiene id_equipo para guardar la bitácora.')

    await apiFetch('/api/bitacoras', {
      method: 'POST',
      body: JSON.stringify({
        id_equipo: idEquipo,
        fecha: isoDate(),
        funcionamiento_correcto: !!falla.funcionamiento_correcto,
        funcionamiento_incorrecto: !!falla.funcionamiento_incorrecto,
        sensores_correcto: !!falla.sensores_correcto,
        sensores_incorrecto: !!falla.sensores_incorrecto,
        requiere_reparacion_si: !!falla.requiere_reparacion_si,
        requiere_reparacion_no: !!falla.requiere_reparacion_no,
        observaciones: falla.observaciones || '',
      }),
    })

    await loadBitacoras()
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
  });

  const fecha = isoDate();
  const fmt = (v) => String(v ?? "").trim() || "—";

  function setRadio(group, value) {
    if (group === "func") {
      setFallo((p) => ({
        ...p,
        funcionamiento_correcto: value === "correcto",
        funcionamiento_incorrecto: value === "incorrecto",
      }));
    }

    if (group === "sens") {
      setFallo((p) => ({
        ...p,
        sensores_correcto: value === "correcto",
        sensores_incorrecto: value === "incorrecto",
      }));
    }

    if (group === "rep") {
      setFallo((p) => ({
        ...p,
        requiere_reparacion_si: value === "si",
        requiere_reparacion_no: value === "no",
      }));
    }
  }

  function handleSave() {
    if (!fallo.funcionamiento_correcto && !fallo.funcionamiento_incorrecto) {
      return pushToast("error", "Selecciona el funcionamiento");
    }
    if (!fallo.sensores_correcto && !fallo.sensores_incorrecto) {
      return pushToast("error", "Selecciona sensores");
    }
    if (!fallo.requiere_reparacion_si && !fallo.requiere_reparacion_no) {
      return pushToast("error", "Indica si requiere reparación");
    }
    onSave(fallo);
  }

  return (
    <div className="bitacora-sheet report-falla-sheet">
      <div className="bitacora-head report-falla-head">
        <div className="bitacora-logos">
          <img src={logoLeft} alt="Logo izquierdo" />
        </div>

        <div className="bitacora-title">
          <div className="t1">HOSPITAL DE ESPECIALIDADES "DR. ANTONIO GONZALEZ GUEVARA"</div>
          <div className="t2">AREA DE MANTENIMIENTO</div>
          <div className="t3">REPORTE DE FALLA</div>
        </div>

        <div className="bitacora-logos right">
          <img src={logoRight} alt="Logo derecho" />
        </div>
      </div>

      <div className="small muted report-falla-date">
        Fecha: <strong>{fecha}</strong>
      </div>

      {/* ===== DESKTOP / TABLE ===== */}
      <div className="bitacora-table-wrap report-falla-desktop">
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
                <input
                  type="radio"
                  name="rf-func"
                  checked={!!fallo.funcionamiento_correcto}
                  onChange={() => setRadio("func", "correcto")}
                />
              </td>
              <td className="center">
                <input
                  type="radio"
                  name="rf-func"
                  checked={!!fallo.funcionamiento_incorrecto}
                  onChange={() => setRadio("func", "incorrecto")}
                />
              </td>

              <td className="center">
                <input
                  type="radio"
                  name="rf-sens"
                  checked={!!fallo.sensores_correcto}
                  onChange={() => setRadio("sens", "correcto")}
                />
              </td>
              <td className="center">
                <input
                  type="radio"
                  name="rf-sens"
                  checked={!!fallo.sensores_incorrecto}
                  onChange={() => setRadio("sens", "incorrecto")}
                />
              </td>

              <td className="center">
                <input
                  type="radio"
                  name="rf-rep"
                  checked={!!fallo.requiere_reparacion_si}
                  onChange={() => setRadio("rep", "si")}
                />
              </td>
              <td className="center">
                <input
                  type="radio"
                  name="rf-rep"
                  checked={!!fallo.requiere_reparacion_no}
                  onChange={() => setRadio("rep", "no")}
                />
              </td>

              <td>{fecha}</td>

              <td>
                <input
                  className="bitacora-obs"
                  value={fallo.observaciones}
                  onChange={(e) =>
                    setFallo((p) => ({ ...p, observaciones: e.target.value }))
                  }
                  placeholder="Escribe observaciones..."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE / STACK ===== */}
      <div className="report-falla-mobile">
        <div className="report-card">
          <div className="report-card__grid">
            <div><span>No. inventario</span><strong>{fmt(equipo?.numero_inventario)}</strong></div>
            <div><span>Equipo</span><strong>{fmt(equipo?.nombre_equipo)}</strong></div>
            <div><span>Marca</span><strong>{fmt(equipo?.marca)}</strong></div>
            <div><span>Modelo</span><strong>{fmt(equipo?.modelo)}</strong></div>
            <div><span>Número de serie</span><strong>{fmt(equipo?.numero_serie)}</strong></div>
            <div><span>Ubicación específica</span><strong>{fmt(equipo?.ubicacion_especifica)}</strong></div>
            <div><span>Fecha</span><strong>{fecha}</strong></div>
          </div>
        </div>

        <div className="report-card">
          <div className="report-section-title">Funcionamiento</div>
          <div className="report-options">
            <label className={`report-option ${fallo.funcionamiento_correcto ? "is-active" : ""}`}>
              <input
                type="radio"
                name="rf-func-mobile"
                checked={!!fallo.funcionamiento_correcto}
                onChange={() => setRadio("func", "correcto")}
              />
              <span>Correcto</span>
            </label>

            <label className={`report-option ${fallo.funcionamiento_incorrecto ? "is-active" : ""}`}>
              <input
                type="radio"
                name="rf-func-mobile"
                checked={!!fallo.funcionamiento_incorrecto}
                onChange={() => setRadio("func", "incorrecto")}
              />
              <span>Incorrecto</span>
            </label>
          </div>
        </div>

        <div className="report-card">
          <div className="report-section-title">Sensores</div>
          <div className="report-options">
            <label className={`report-option ${fallo.sensores_correcto ? "is-active" : ""}`}>
              <input
                type="radio"
                name="rf-sens-mobile"
                checked={!!fallo.sensores_correcto}
                onChange={() => setRadio("sens", "correcto")}
              />
              <span>Correcto</span>
            </label>

            <label className={`report-option ${fallo.sensores_incorrecto ? "is-active" : ""}`}>
              <input
                type="radio"
                name="rf-sens-mobile"
                checked={!!fallo.sensores_incorrecto}
                onChange={() => setRadio("sens", "incorrecto")}
              />
              <span>Incorrecto</span>
            </label>
          </div>
        </div>

        <div className="report-card">
          <div className="report-section-title">¿Requiere reparación?</div>
          <div className="report-options">
            <label className={`report-option ${fallo.requiere_reparacion_si ? "is-active" : ""}`}>
              <input
                type="radio"
                name="rf-rep-mobile"
                checked={!!fallo.requiere_reparacion_si}
                onChange={() => setRadio("rep", "si")}
              />
              <span>Sí</span>
            </label>

            <label className={`report-option ${fallo.requiere_reparacion_no ? "is-active" : ""}`}>
              <input
                type="radio"
                name="rf-rep-mobile"
                checked={!!fallo.requiere_reparacion_no}
                onChange={() => setRadio("rep", "no")}
              />
              <span>No</span>
            </label>
          </div>
        </div>

        <div className="report-card">
          <div className="report-section-title">Observaciones</div>
          <textarea
            className="report-falla-textarea"
            value={fallo.observaciones}
            onChange={(e) =>
              setFallo((p) => ({ ...p, observaciones: e.target.value }))
            }
            placeholder="Escribe observaciones..."
            rows={4}
          />
        </div>
      </div>

      <div className="report-falla-actions">
        <button className="nav-btn" onClick={onCancel}>
          Cancelar
        </button>

        <button className="btn" onClick={handleSave}>
          Guardar y enviar
        </button>
      </div>
    </div>
  );
}

  function openReportFallaModal(equipo) {
    const eq = equipo || {}
    openModal(`Reporte de falla · ${eq.numero_inventario || eq.numero_serie || 'Equipo'}`, (
      <ReportFallaSheet
        equipo={eq}
        onCancel={closeModal}
        onSave={async (fallo) => {
          try {
            await addToBitacoras(eq, fallo)
            await addToFormularioPendiente(eq, fallo)
            closeModal()
            setView('bitacora')
            pushToast('success', 'Falla registrada. Se agregó a Bitácoras y Pendientes.')
          } catch (e) {
            pushToast('error', e?.message || 'No se pudo guardar la falla en bitácoras')
          }
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
    pushToast('info', 'Las bitácoras se crean automáticamente al reportar fallas.')
  }

  function openBitacoraDetail(b) {
    openBitacoraModal(b.id)
  }

  
async function downloadBitacora(b, tipo) {
  if (!b) return;

  const t = String(tipo || "").toLowerCase();
  if (t !== "pdf" && t !== "excel") return;

  try {
    // Usa la bitácora completa si ya viene cargada;
    // si no, la pide al backend igual que cuando abres el modal.
    const ref = b?.fecha || b?.id || b;
    const fullBitacora = b?.items?.length ? b : await fetchBitacoraSheet(ref);

    if (!fullBitacora) {
      throw new Error("No se pudo cargar la bitácora");
    }

    if (!fullBitacora?.items?.length) {
      throw new Error("La bitácora no tiene artículos para exportar");
    }

    if (t === "excel") {
      await exportBitacoraExcel({
        bitacora: fullBitacora,
      });
      return;
    }

    if (t === "pdf") {
      await exportBitacoraPdf({
        bitacora: fullBitacora,
        logoLeftUrl: logoLeft,
        logoRightUrl: logoRight,
      });
    }
  } catch (e) {
    pushToast("error", e?.message || "No se pudo descargar la bitácora");
  }
}




  const content = useMemo(() => {
    if (view === 'home') {
      return (
        <Home
          inventario={inventario}
          bitacoras={bitacoras}
          onGoForm={auth?.rol === "jefe" ? () => setView("formulario") : undefined}
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
      return <Bitacora bitacoras={bitacoras} toast={toast} onNew={createNewBitacora} onOpen={openBitacoraDetail} onDownload={downloadBitacora} />
    }
    if (view === 'perfil') {
      return <PerfilUsuarios auth={auth} toast={toast} />
    }
    if (view === 'papelera') {
      return <Papelera
  auth={auth}
  toast={toast}
  onBack={() => setView("inventario")}
  onRestored={() => loadInventario()}
/>
    }
    return (
      <Formulario
        inventario={inventario}
        pendientes={pendientes}
        terminados={terminados}
        toast={toast}
        onReload={loadFormularios}
      />
    )
  }, [view, auth, inventario, areas, categorias, bitacoras, pendientes, terminados, toast])

if (view === "reset-password") {
  return (
    <>
      <ResetPasswordView
        toast={toast}
        onGoLogin={() => {
          window.history.pushState({}, "", "/");
          setView("login");
        }}
      />
      <ToastViewport scope="fixed" />
    </>
  );
}
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



  //  Bitácora (vista completa dentro del modal, como en Hospital.zip)
  function BitacoraSheet({ bitacoraId }) {
      const [bitacoraData, setBitacoraData] = useState(null)
      const [loadingSheet, setLoadingSheet] = useState(true)
      const [sheetError, setSheetError] = useState('')

useEffect(() => {
  if (!bitacoraId) return;

  let cancelled = false;

  async function run() {
    try {
      setLoadingSheet(true);
      setSheetError("");

      const data = await fetchBitacoraSheet(bitacoraId);

      if (!cancelled) {
        setBitacoraData(data);
      }
    } catch (e) {
      if (!cancelled) {
        setSheetError(e?.message || "No se pudo cargar la bitácora.");
      }
    } finally {
      if (!cancelled) {
        setLoadingSheet(false);
      }
    }
  }

  run();

  return () => {
    cancelled = true;
  };
}, [bitacoraId]);

      const fmt = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v))

      function changeRow(idx, patch) {
        setBitacoraData(prev => {
          if (!prev) return prev
          const items = Array.isArray(prev.items) ? [...prev.items] : []
          items[idx] = { ...(items[idx] || {}), ...patch }
          return { ...prev, items }
        })
      }

      async function persistRow(idx, patch = {}) {
        let nextRow = null

        setBitacoraData(prev => {
          if (!prev) return prev
          const items = Array.isArray(prev.items) ? [...prev.items] : []
          nextRow = { ...(items[idx] || {}), ...patch }
          items[idx] = nextRow
          return { ...prev, items }
        })

        if (!nextRow?.id_bitacora) return

        try {
          await apiFetch('/api/bitacoras/entry', {
            method: 'PUT',
            body: JSON.stringify({
              id_bitacora: nextRow.id_bitacora,
              funcionamiento_correcto: !!nextRow.funcionamiento_correcto,
              funcionamiento_incorrecto: !!nextRow.funcionamiento_incorrecto,
              sensores_correcto: !!nextRow.sensores_correcto,
              sensores_incorrecto: !!nextRow.sensores_incorrecto,
              requiere_reparacion_si: !!nextRow.requiere_reparacion_si,
              requiere_reparacion_no: !!nextRow.requiere_reparacion_no,
              observaciones: nextRow.observaciones || '',
            }),
          })
        } catch (e) {
          pushToast('error', e?.message || 'No se pudo actualizar la bitácora')
        }
      }

      if (loadingSheet) return <div>Cargando bitácora...</div>
      if (sheetError) return <div>{sheetError}</div>

      const b = bitacoraData
      if (!b) return <div>No se encontró la bitácora.</div>

      const rows = (b.items?.length ? b.items : [])

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

<div className="bitacora-table-wrap bitacora-open-desktop">
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
          <tr key={row.id_bitacora || idx}>
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
                onChange={() => persistRow(idx, { funcionamiento_correcto: true, funcionamiento_incorrecto: false })}
              />
            </td>
            <td className="center">
              <input
                type="radio"
                name={name('func')}
                checked={!!row.funcionamiento_incorrecto}
                onChange={() => persistRow(idx, { funcionamiento_correcto: false, funcionamiento_incorrecto: true })}
              />
            </td>

            <td className="center">
              <input
                type="radio"
                name={name('sens')}
                checked={!!row.sensores_correcto}
                onChange={() => persistRow(idx, { sensores_correcto: true, sensores_incorrecto: false })}
              />
            </td>
            <td className="center">
              <input
                type="radio"
                name={name('sens')}
                checked={!!row.sensores_incorrecto}
                onChange={() => persistRow(idx, { sensores_correcto: false, sensores_incorrecto: true })}
              />
            </td>

            <td className="center">
              <input
                type="radio"
                name={name('rep')}
                checked={!!row.requiere_reparacion_si}
                onChange={() => persistRow(idx, { requiere_reparacion_si: true, requiere_reparacion_no: false })}
              />
            </td>
            <td className="center">
              <input
                type="radio"
                name={name('rep')}
                checked={!!row.requiere_reparacion_no}
                onChange={() => persistRow(idx, { requiere_reparacion_si: false, requiere_reparacion_no: true })}
              />
            </td>

            <td>{fmt(b.fecha)}</td>

            <td>
              <input
                className="bitacora-obs"
                value={row.observaciones || ''}
                onChange={(e) => changeRow(idx, { observaciones: e.target.value })}
                onBlur={() => persistRow(idx)}
                placeholder="Escribe observaciones..."
              />
            </td>
          </tr>
        )
      })}
    </tbody>
  </table>
</div>

<div className="bitacora-open-mobile">
  {rows.map((cur, idx) => {
    const row = cur || {}
    const name = (suffix) => `${b.id}-${idx}-${suffix}`

    return (
      <div className="bitacora-mobile-card" key={row.id_bitacora || idx}>
        <div className="bitacora-mobile-grid">
          <div><span>No. inventario</span><strong>{fmt(row.numero_inventario || row.inventario || row.inv)}</strong></div>
          <div><span>Equipo médico</span><strong>{fmt(row.equipo || row.nombre_equipo || row.nombre)}</strong></div>
          <div><span>Marca</span><strong>{fmt(row.marca)}</strong></div>
          <div><span>Modelo</span><strong>{fmt(row.modelo)}</strong></div>
          <div><span>Número de serie</span><strong>{fmt(row.numero_serie || row.serie)}</strong></div>
          <div><span>Ubicación específica</span><strong>{fmt(row.ubicacion_especifica || row.ubicacion)}</strong></div>
          <div><span>Fecha</span><strong>{fmt(b.fecha)}</strong></div>
        </div>

        <div className="bitacora-mobile-section">
          <div className="bitacora-mobile-title">Funcionamiento</div>
          <div className="bitacora-mobile-options">
            <label className={`bitacora-mobile-option ${row.funcionamiento_correcto ? 'is-active' : ''}`}>
              <input
                type="radio"
                name={name('func-mobile')}
                checked={!!row.funcionamiento_correcto}
                onChange={() => persistRow(idx, { funcionamiento_correcto: true, funcionamiento_incorrecto: false })}
              />
              <span>Correcto</span>
            </label>

            <label className={`bitacora-mobile-option ${row.funcionamiento_incorrecto ? 'is-active' : ''}`}>
              <input
                type="radio"
                name={name('func-mobile')}
                checked={!!row.funcionamiento_incorrecto}
                onChange={() => persistRow(idx, { funcionamiento_correcto: false, funcionamiento_incorrecto: true })}
              />
              <span>Incorrecto</span>
            </label>
          </div>
        </div>

        <div className="bitacora-mobile-section">
          <div className="bitacora-mobile-title">Sensores</div>
          <div className="bitacora-mobile-options">
            <label className={`bitacora-mobile-option ${row.sensores_correcto ? 'is-active' : ''}`}>
              <input
                type="radio"
                name={name('sens-mobile')}
                checked={!!row.sensores_correcto}
                onChange={() => persistRow(idx, { sensores_correcto: true, sensores_incorrecto: false })}
              />
              <span>Correcto</span>
            </label>

            <label className={`bitacora-mobile-option ${row.sensores_incorrecto ? 'is-active' : ''}`}>
              <input
                type="radio"
                name={name('sens-mobile')}
                checked={!!row.sensores_incorrecto}
                onChange={() => persistRow(idx, { sensores_correcto: false, sensores_incorrecto: true })}
              />
              <span>Incorrecto</span>
            </label>
          </div>
        </div>

        <div className="bitacora-mobile-section">
          <div className="bitacora-mobile-title">¿Requiere reparación?</div>
          <div className="bitacora-mobile-options">
            <label className={`bitacora-mobile-option ${row.requiere_reparacion_si ? 'is-active' : ''}`}>
              <input
                type="radio"
                name={name('rep-mobile')}
                checked={!!row.requiere_reparacion_si}
                onChange={() => persistRow(idx, { requiere_reparacion_si: true, requiere_reparacion_no: false })}
              />
              <span>Sí</span>
            </label>

            <label className={`bitacora-mobile-option ${row.requiere_reparacion_no ? 'is-active' : ''}`}>
              <input
                type="radio"
                name={name('rep-mobile')}
                checked={!!row.requiere_reparacion_no}
                onChange={() => persistRow(idx, { requiere_reparacion_si: false, requiere_reparacion_no: true })}
              />
              <span>No</span>
            </label>
          </div>
        </div>

        <div className="bitacora-mobile-section">
          <div className="bitacora-mobile-title">Observaciones</div>
          <textarea
            className="bitacora-mobile-textarea"
            value={row.observaciones || ''}
            onChange={(e) => changeRow(idx, { observaciones: e.target.value })}
            onBlur={() => persistRow(idx)}
            placeholder="Escribe observaciones..."
            rows={4}
          />
        </div>
      </div>
    )
  })}
</div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
           
          </div>
        </div>
      )
  }

  return (
    <>
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
