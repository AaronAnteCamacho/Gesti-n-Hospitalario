const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  // ✅ 1) primero intenta token separado
  let token = localStorage.getItem("token");
  if (token) return token;

  // ✅ 2) compatibilidad con formato viejo: auth = { token, usuario }
  try {
    const auth = JSON.parse(localStorage.getItem("auth") || "null");
    if (auth?.token) return auth.token;
  } catch {}

  return null;
}

/**
 * apiFetch(path, options)
 * - Por defecto manda Authorization si hay token
 * - Si pasas options.skipAuth = true -> NO manda Authorization (útil para /auth/recover, /auth/reset)
 */
export async function apiFetch(path, options = {}) {
  const { skipAuth, headers, ...rest } = options;

  const token = skipAuth ? null : getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // ✅ por si el backend manda vacío o texto
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) throw new Error(data?.message || "Error API");
  return data;
}

/** =========================
 *  HELPERS: AUTH (PUBLICOS)
 *  ========================= */

export function authRecover(correo) {
  return apiFetch("/api/auth/recover", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ correo }),
  });
}

export function authReset(token, password) {
  return apiFetch("/api/auth/reset", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ token, password }),
  });
}