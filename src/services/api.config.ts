import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
//  ★  URL DEL BACKEND
//
//  Lee desde .env → variable VITE_API_URL
//  Si no existe, usa http://localhost:8080 como fallback.
//
//  Para cambiarla:
//    Desarrollo → edita .env:  VITE_API_URL=http://localhost:8080
//    Producción → configura en tu plataforma (Vercel, Render, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// Añade el JWT automáticamente en cada request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// 401 global → limpia sesión y redirige al login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
