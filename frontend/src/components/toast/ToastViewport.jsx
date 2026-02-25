import React from "react";

export default function ToastViewport({ toasts, onClose, position = "top-right" }) {
  function closeToast(t) {
    // si era confirmación y cierran con X, resolvemos como "false"
    if (t.type === "confirm" && typeof t.onResolve === "function") {
      t.onResolve(false);
    }
    onClose(t.id);
  }

  function action(t, value) {
    if (typeof t.onResolve === "function") t.onResolve(value);
    onClose(t.id);
  }

  return (
    <div className={`toast-viewport ${position}`} aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} role={t.type === "error" ? "alert" : "status"}>
          <div className="toast__bar" />

          <div className="toast__head">
            <div className="toast__title">{t.title}</div>
            <button className="toast__close" onClick={() => closeToast(t)} aria-label="Cerrar">
              ×
            </button>
          </div>

          <div className="toast__msg">{t.message}</div>

          {/* Botones para confirm */}
          {t.type === "confirm" && Array.isArray(t.actions) && (
            <div className="toast__actions">
              {t.actions.map((a, idx) => (
                <button
                  key={idx}
                  className={`toast__btn ${a.variant === "primary" ? "toast__btn--primary" : "toast__btn--ghost"}`}
                  onClick={() => action(t, a.value)}
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