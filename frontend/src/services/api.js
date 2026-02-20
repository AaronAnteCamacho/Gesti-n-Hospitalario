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

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
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
