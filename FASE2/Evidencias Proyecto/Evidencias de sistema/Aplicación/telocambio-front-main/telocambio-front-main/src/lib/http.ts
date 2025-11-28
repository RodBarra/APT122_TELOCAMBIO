// src/lib/http.ts
import axios from "axios";
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * Axios singleton + helper `request<T>`:
 * - Autenticación por JWT en header Authorization.
 * - Refresh token ante 401/expirado.
 * - API “fetch-like” que devuelve `data` directo.
 */

const baseURL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://127.0.0.1:8000";

export const http = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    // IMPORTANTE: No fijar Content-Type global.
    "X-Requested-With": "XMLHttpRequest",
  },
});

// ---- Refresh orchestration ----
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function enqueue(cb: (token: string | null) => void) {
  refreshQueue.push(cb);
}
function resolveQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("tk_refresh");
  if (!refresh) return null;
  try {
    const resp = await axios.post<{ access: string }>(
      `${baseURL}/auth/refresh`,
      { refresh }
    );
    const newAccess = resp.data?.access;
    if (newAccess) {
      localStorage.setItem("tk_access", newAccess);
      return newAccess;
    }
    return null;
  } catch {
    return null;
  }
}

// ---- Request interceptor: adjunta Authorization salvo endpoints públicos ----
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = config.url || "";
  const isPublicAuth = /^\/auth\/(login|register|verify-access|refresh)/.test(url);
  if (!isPublicAuth) {
    const token = localStorage.getItem("tk_access");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ---- Response interceptor: intenta refresh ante 401/token inválido ----
http.interceptors.response.use(
  (r: AxiosResponse) => r,
  async (error: AxiosError<any>) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | null;

    const status = error.response?.status;
    const msg =
      (error.response?.data as any)?.detail ||
      (error.response?.data as any)?.message ||
      "";

    const shouldTryRefresh =
      status === 401 || /token/i.test(String(msg)) || /not valid/i.test(String(msg));

    if (original && shouldTryRefresh && !original._retry) {
      (original as any)._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          enqueue((token) => {
            if (token && original) {
              (original.headers as any) = {
                ...(original.headers || {}),
                Authorization: `Bearer ${token}`,
              };
              resolve(http(original));
            } else {
              resolve(Promise.reject(error));
            }
          });
        });
      }

      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      resolveQueue(newToken);

      if (newToken && original) {
        (original.headers as any) = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return http(original);
      } else {
        localStorage.removeItem("tk_access");
        localStorage.removeItem("tk_refresh");
        localStorage.removeItem("tk_user");
      }
    }

    return Promise.reject(error);
  }
);

/**
 * request<T>: API fetch-like sobre el axios instance:
 * - Detecta FormData vs JSON.
 * - Para JSON, garantiza Content-Type y deja que Axios serialice.
 */
export async function request<T = any>(
  url: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = { ...(options.headers || {}) };

  // Si es FormData, NO fijes Content-Type (el browser pondrá boundary).
  if (isFormData) {
    delete headers["Content-Type"];
  } else if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await http.request<T>({
    url,
    method,
    data: options.body, // Axios convierte objetos a JSON automáticamente con Content-Type JSON
    headers,
  });

  return res.data as T;
}

// (Opcional) set global Authorization si necesitas
export function setAuthHeader(token: string | null) {
  if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete http.defaults.headers.common.Authorization;
}
