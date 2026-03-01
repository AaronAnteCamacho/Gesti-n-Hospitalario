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
    (toast) => {
      const id = uid();
      const duration = toast.duration ?? defaultDuration;

      setToasts((prev) => [
        ...prev,
        {
          id,
          type: toast.type || "info",
          title: toast.title || "Notificación",
          message: toast.message || "",
          duration,
          createdAt: Date.now(),
          ...toast,
        },
      ]);

      if (duration && duration > 0) {
        window.setTimeout(() => remove(id), duration);
      }

      return id;
    },
    [defaultDuration, remove]
  );

  const api = useMemo(
    () => ({
      show,
      success: (message, opts = {}) =>
        show({ type: "success", title: "Notificación", message, ...opts }),
      error: (message, opts = {}) => show({ type: "error", title: "Notificación", message, ...opts }),
      info: (message, opts = {}) => show({ type: "info", title: "Notificación", message, ...opts }),

      // confirmación con Promise
      confirm: (message, opts = {}) =>
        new Promise((resolve) => {
          const id = uid();

          const okVariant = opts.okVariant || "primary";
          const cancelVariant = opts.cancelVariant || "ghost";

          setToasts((prev) => [
            ...prev,
            {
              id,
              type: "confirm",
              title: opts.title || "Confirmación",
              message,
              duration: 0, // no se cierra solo
              createdAt: Date.now(),
              onResolve: resolve,

              // 👇 esto controla el color del encabezado/franja del confirm
              confirmVariant: okVariant === "danger" ? "danger" : "primary",

              actions: [
                { label: opts.cancelText || "Cancelar", value: false, variant: cancelVariant },
                { label: opts.okText || "Aceptar", value: true, variant: okVariant },
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
  return useContext(ToastCtx);
}