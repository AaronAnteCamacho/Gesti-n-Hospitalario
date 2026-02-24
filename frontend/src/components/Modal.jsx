import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "../styles/Modal.css";
import closeIcon from "../assets/close_icon.ico"; 

// ✅ toasts (opcional):
// - toasts: [{ id, type: "success"|"error"|"info", title, message }]
// - onToastClose: (id) => void
export default function Modal({ open, title, children, onClose, toasts = [], onToastClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const node = (
    <div
      className="modal-back"
      style={{
        display: "flex",
        zIndex: 999999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      <div className="modal" style={{ position: "relative" }}>
        {/*TOASTS dentro del modal */}
        {Array.isArray(toasts) && toasts.length > 0 && (
          <div className="toastHost toastHost--modal" aria-live="polite" aria-atomic="true">
            {toasts.map((t) => (
              <div key={t.id} className={`toast toast--${t.type || "info"}`}>
                <div className="toast__top">
                  <div className="toast__title">{t.title || "Notificación"}</div>
                  <button
                    type="button"
                    className="toast__close"
                    onClick={() => onToastClose?.(t.id)}
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>
                {t.message ? <div className="toast__msg">{t.message}</div> : null}
              </div>
            ))}
          </div>
        )}

        <div className="modal__top">
          <h3 className="modal__title">{title}</h3>
          <button className="modal-closeIcon" onClick={onClose} type="button" aria-label="Cerrar"
            title="Cerrar"
          >
            <img src={closeIcon} alt="Cerrar" />
          </button>
        </div>

        <div className="modal__body">{children}</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
