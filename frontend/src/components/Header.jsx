import React, { useEffect, useRef, useState } from 'react'
import logoLeft from '../assets/logo_left.png'
import logoRight from '../assets/logo_right.png'
import avatarJefe from "../assets/Jefe.jpeg";
import avatarUsuario from "../assets/Empleado.jpeg";

import homeIcon from '../assets/home_icon.png'
import inventoryIcon from '../assets/inventory_icon.png'
import logIcon from '../assets/log_icon.png'
import formIcon from '../assets/form_icon.png'

import '../styles/Header.css'

export default function Header({
  view,
  setView,
  auth,
  onTrashClick,
  onAddClick,
  onAvatarClick,
  onLogout,
  notifications = [],
  unreadCount = 0,
  notifOpen = false,
  onToggleNotifs,
  onMarkNotifRead,
  onMarkAllNotifsRead,
}) {
  const isJefe = auth?.rol === 'jefe'

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userWrapRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (!userWrapRef.current) return
      if (!userWrapRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const NavBtn = ({ id, label }) => (
    <button
      className={'nav-btn' + (view === id ? ' active' : '')}
      onClick={() => setView(id)}
    >
      {label}
    </button>
  )

  const MobileShortcut = ({ id, label, imgSrc }) => (
    <button
      className={'appHeader__mobileShortcut' + (view === id ? ' active' : '')}
      onClick={() => setView(id)}
      title={label}
      type="button"
    >
      <img src={imgSrc} alt={label} className="appHeader__mobileShortcutImg" />
    </button>
  )

  function handleOpenProfile(tab) {
    setUserMenuOpen(false)
    onAvatarClick?.(tab)
  }

  function handleLogout() {
    setUserMenuOpen(false)
    if (onLogout) return onLogout()

    try {
      localStorage.removeItem("auth")
      localStorage.removeItem("token")
    } catch {}
    window.location.reload()
  }

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

        {/* Nav desktop */}
        <nav className="appHeader__nav">
          <NavBtn id="home" label="Home" />
          <NavBtn id="inventario" label="Inventario" />
          <NavBtn id="bitacora" label="Bitácora" />
          {isJefe && <NavBtn id="formulario" label="Orden de Servicio" />}
        </nav>

        {/* Right */}
        <div className="appHeader__right">
          <img src={logoRight} alt="Logo derecho" style={{ height: 44, objectFit: 'contain' }} />

          <div className="appHeader__userWrap" ref={userWrapRef} onClick={(e) => e.stopPropagation()}>
            <img
              className="hdr-avatar"
              src={isJefe ? avatarJefe : avatarUsuario}
              alt={isJefe ? "Perfil jefe" : "Perfil usuario"}
              title={isJefe ? "Jefe" : "Empleado"}
              role="button"
              onClick={() => setUserMenuOpen(v => !v)}
              style={{ cursor: 'pointer' }}
            />

            {userMenuOpen && (
              <div className="appHeader__userMenu">
                <button
                  className="appHeader__userItem"
                  type="button"
                  onClick={() => handleOpenProfile("me")}
                >
                  <i className="fa-solid fa-user-pen"></i>
                  <span>Editar perfil</span>
                </button>

                {isJefe && (
                  <button
                    className="appHeader__userItem"
                    type="button"
                    onClick={() => handleOpenProfile("users")}
                  >
                    <i className="fa-solid fa-users-gear"></i>
                    <span>Agregar usuario</span>
                  </button>
                )}

                <div className="appHeader__userSep" />

                <button
                  className="appHeader__userItem danger"
                  type="button"
                  onClick={handleLogout}
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>

          {isJefe && (
            <div className="appHeader__notifWrap" onClick={(e) => e.stopPropagation()}>
              <div
                className="appHeader__icon"
                title="Notificaciones"
                onClick={() => onToggleNotifs?.()}
              >
                <i className="fa-solid fa-bell fa-lg"></i>
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

          <div className="appHeader__group">
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

        {/* Nav móvil con imágenes */}
        <div className="appHeader__mobileNav">
          <MobileShortcut id="home" label="Home" imgSrc={homeIcon} />
          <MobileShortcut id="inventario" label="Inventario" imgSrc={inventoryIcon} />
          <MobileShortcut id="bitacora" label="Bitácora" imgSrc={logIcon} />
          {isJefe && (
            <MobileShortcut id="formulario" label="Orden de Servicio" imgSrc={formIcon} />
          )}
        </div>
      </div>
    </header>
  )
}