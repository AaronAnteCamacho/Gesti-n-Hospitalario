const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  const auth = JSON.parse(localStorage.getItem("auth") || "null");
  return auth?.token || null;
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error API");
  return data;
}
