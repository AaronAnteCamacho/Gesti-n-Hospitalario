import React from 'react'
import logoLeft from '../assets/logo_left.png'
import logoRight from '../assets/logo_right.png'
import avatarJefe from "../assets/Jefe.jpeg";
import avatarUsuario from "../assets/Empleado.jpeg";
import '../styles/Header.css'


export default function Header({
  view,
  setView,
  auth,
  onTrashClick,
  onAddClick,
  notifications = [],
  unreadCount = 0,
  notifOpen = false,
  onToggleNotifs,
  onMarkNotifRead,
  onMarkAllNotifsRead,
}) {
  const isJefe = auth?.rol === 'jefe'

  const NavBtn = ({ id, label }) => (
    <button
      className={'nav-btn' + (view === id ? ' active' : '')}
      onClick={() => setView(id)}
    >
      {label}
    </button>
  )

  return (
    <header className="appHeader">
      <div className="container appHeader__bar">
        {/* Brand */}
        <div className="appHeader__brand">
          <img src={logoLeft} alt="Logo izquierdo" />
          <div className="appHeader__titles">
            <div className="app-title">Gestor Hospitalario</div>
            <div className="small">Inventario · Bitácoras · Formularios</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="appHeader__nav">
          <NavBtn id="home" label="Home" />
          <NavBtn id="inventario" label="Inventario" />
          <NavBtn id="bitacora" label="Bitácora" />
          <NavBtn id="formulario" label="Orden de Servicio" />
        </nav>

        {/* Right */}
        <div className="appHeader__right">
          <img src={logoRight} alt="Logo derecho" style={{ height: 44, objectFit: 'contain' }} />

          <img
            className="hdr-avatar"
            src={isJefe ? avatarJefe : avatarUsuario}
            alt={isJefe ? "Perfil jefe" : "Perfil usuario"}
            title={isJefe ? "Jefe" : "Empleado"}
          />

          {/* Notificaciones */}
          {isJefe && (
            <div className="appHeader__notifWrap" onClick={(e) => e.stopPropagation()}>
              <div
                className="appHeader__icon"
                title="Notificaciones"
                onClick={() => onToggleNotifs?.()}
              >
                <i className="fa-solid fa-bell fa-lg"></i>
                {/* ✅ sin número: solo punto cuando hay no leídas */}
                {unreadCount > 0 ? <span className="appHeader__dot" /> : null}
              </div>

              {notifOpen && (
                <div className="appHeader__notifPanel">
                  <div className="appHeader__notifHead">
                    <div className="appHeader__notifTitle">Notificaciones</div>
                    <button
                      className="appHeader__notifBtn"
                      onClick={() => onMarkAllNotifsRead?.()}
                      disabled={unreadCount === 0}
                      title="Marcar todas como leídas"
                    >
                      Marcar todo
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="appHeader__notifEmpty">Sin notificaciones</div>
                  ) : (
                    <div className="appHeader__notifList">
                      {notifications.map((n) => (
                        <div key={n.id_notificacion} className="appHeader__notifItem">
                          <div className="appHeader__notifMsg">{n.mensaje}</div>
                          <div className="appHeader__notifMeta">
                            <span>{new Date(n.fecha_creacion).toLocaleString()}</span>
                            <button
                              className="appHeader__notifLink"
                              onClick={() => onMarkNotifRead?.(n.id_notificacion)}
                            >
                              Leída
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="appHeader__group">
            {isJefe && (
              <div
                className="appHeader__icon"
                title="Usuarios"
                onClick={() => setView('perfil')}
              >
                <i className="fa-solid fa-users fa-lg"></i>
              </div>
            )}

            {isJefe && (
              <div
                className="appHeader__icon appHeader__actionPlus"
                title="Agregar"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddClick?.()
                }}
              >
                <i className="fa-solid fa-plus"></i>
              </div>
            )}

            <div
              className="appHeader__icon appHeader__actionTrash"
              title="Papelera"
              onClick={(e) => {
                e.stopPropagation()
                onTrashClick?.()
              }}
            >
              <i className="fa-solid fa-trash-can fa-lg"></i>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}