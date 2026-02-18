import React from "react";

export default function ToastViewport({ toasts, onClose, position = "top-right" }) {
  return (
    <div className={`toast-viewport ${position}`} aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} role={t.type === "error" ? "alert" : "status"}>
          <div className="toast__bar" />
          <div className="toast__head">
            <div className="toast__title">{t.title}</div>
            <button className="toast__close" onClick={() => onClose(t.id)} aria-label="Cerrar">
              ×
            </button>
          </div>
          <div className="toast__msg">{t.message}</div>
        </div>
      ))}
    </div>
  );
}
