import React from 'react'
import logoLeft from '../assets/logo_left.png'
import logoRight from '../assets/logo_right.png'
import '../styles/Header.css'

export default function Header({ view, setView, auth, onTrashClick, onAddClick }) {
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

          {/* Notificaciones */}
          <div className="appHeader__icon" title="Notificaciones">
            <i className="fa-solid fa-bell fa-lg"></i>
            <span className="appHeader__badge">3</span>
          </div>

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