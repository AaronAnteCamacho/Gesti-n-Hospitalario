import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "../styles/Modal.css";

export default function Modal({ open, title, children, onClose }) {
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
        display: "flex",      // <-- fuerza visible aunque algún CSS ponga display:none
        zIndex: 999999,       // <-- súper arriba
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      <div className="modal">
        <div className="modal__top">
          <h3 className="modal__title">{title}</h3>
          <button type="button" className="modal__closeBtn" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="modal__body">{children}</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}