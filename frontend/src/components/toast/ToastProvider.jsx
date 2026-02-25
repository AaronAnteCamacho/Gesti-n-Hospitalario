import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import ToastViewport from "./ToastViewport.jsx";
import "../../styles/Toast.css";

const ToastCtx = createContext(null);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children, defaultDuration = 2600, position = "top-right" }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ type = "info", title = "Notificación", message = "", duration }) => {
      const id = uid();
      const d = typeof duration === "number" ? duration : defaultDuration;

      setToasts((prev) => [
        ...prev,
        { id, type, title, message, duration: d, createdAt: Date.now() },
      ]);

      // autoclose
      if (d > 0) setTimeout(() => remove(id), d);

      return id;
    },
    [defaultDuration, remove]
  );


const api = useMemo(
  () => ({
    show,
    success: (message, opts = {}) => show({ type: "success", title: "Notificación", message, ...opts }),
    error: (message, opts = {}) => show({ type: "error", title: "Notificación", message, ...opts }),
    info: (message, opts = {}) => show({ type: "info", title: "Notificación", message, ...opts }),

    // confirmación con Promise
    confirm: (message, opts = {}) =>
      new Promise((resolve) => {
        const id = uid();

        setToasts((prev) => [
          ...prev,
          {
            id,
            type: "confirm",
            title: opts.title || "Confirmación",
            message,
            duration: 0, //no se cierra solo
            createdAt: Date.now(),
            onResolve: resolve,
            actions: [
              { label: opts.cancelText || "Cancelar", value: false, variant: "ghost" },
              { label: opts.okText || "Aceptar", value: true, variant: "primary" },
            ],
          },
        ]);
      }),

    remove,
    clear: () => setToasts([]),
  }),
  [show, remove]
);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} position={position} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return ctx;
}
