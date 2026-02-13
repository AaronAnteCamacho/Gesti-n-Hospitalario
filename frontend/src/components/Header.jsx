import React from 'react'
import logoLeft from '../assets/logo_left.png'
import logoRight from '../assets/logo_right.png'


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
    <header>
      <div className="container topbar">
        <div className="brand" style={{ alignItems: 'center' }}>
          <img src={logoLeft} alt="Logo izquierdo" style={{ height: 48, objectFit: 'contain' }} />
          <div className="logo" style={{ marginLeft: 8 }}>
            <div>
              <div className="app-title">Gestor Hospitalario</div>
              <div className="small">Inventario · Bitácoras · Formularios</div>
            </div>
          </div>
        </div>

        <nav>
          <NavBtn id="home" label="Home" />
          <NavBtn id="inventario" label="Inventario" />
          <NavBtn id="bitacora" label="Bitácora" />
          <NavBtn id="formulario" label="Orden de Servicio" />
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={logoRight} alt="Logo derecho" style={{ height: 48, objectFit: 'contain' }} />

          <div className="icon-notification" style={{ position: 'relative', cursor: 'pointer' }} title="Notificaciones">
            <i className="fa-solid fa-bell fa-lg"></i>
            <span
              className="badge"
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: 'red',
                color: 'white',
                borderRadius: '50%',
                fontSize: 10,
                padding: '2px 5px',
              }}
            >
              3
            </span>
          </div>

          <div
            className="icon-profile"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            {/* USUARIOS (solo jefe) */}
            {isJefe && (
              <i
                className="fa-solid fa-users fa-lg"
                title="Usuarios"
                onClick={() => setView('perfil')}
              ></i>
            )}

            {/* AGREGAR */}
            {isJefe && (
              <i
                className="fa-solid fa-plus"
                style={{ color: '#16a34a', cursor: 'pointer' }}
                title="Agregar"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddClick?.()
                }}
              ></i>
            )}

            {/* PAPELERA */}
            <i
              className="fa-solid fa-trash-can fa-lg"
              style={{ color: '#b91c1c', cursor: 'pointer' }}
              title="Papelera"
              onClick={(e) => {
                e.stopPropagation()
                onTrashClick?.()
              }}
            ></i>
          </div>

        </div>
      </div>
    </header>
  )
}
