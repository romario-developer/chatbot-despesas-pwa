import { AxiosHeaders } from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { api, apiBaseURL, apiHadApiSuffix, shouldLogApi } from "../services/api";

const AUTH_TOKEN_KEY = "auth_token";
const LEGACY_AUTH_TOKEN_KEY = "despesas_token";
const AUTH_MUST_CHANGE_KEY = "despesas_must_change_password";
const AUTH_USER_KEY = "auth_user";
const PLANNING_STORAGE_KEY = "despesas_pwa_planning_v1";
const LOGIN_MESSAGE_KEY = "despesas_login_message";
const FAILURE_WINDOW_MS = 30_000;
const FAILURE_LIMIT = 5;
const BLOCK_DURATION_MS = 60_000;
const failureTracker = new Map<
  string,
  {
    timestamps: number[];
    blockedUntil?: number;
  }
>();

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

export const getStoredToken = () =>
  localStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);

const setAuthHeader = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const saveToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  setAuthHeader(token);
};

export const getStoredMustChangePassword = () =>
  localStorage.getItem(AUTH_MUST_CHANGE_KEY) === "true";

export const setMustChangePassword = (value: boolean) =>
  localStorage.setItem(AUTH_MUST_CHANGE_KEY, value ? "true" : "false");

export const clearMustChangePassword = () => localStorage.removeItem(AUTH_MUST_CHANGE_KEY);

export const clearToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  clearMustChangePassword();
  setAuthHeader(null);
};

type StoredAuthUser = {
  name?: string;
  email?: string;
};

const normalizeStoredUser = (value: unknown): StoredAuthUser | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!name && !email) return null;
  return {
    name: name || undefined,
    email: email || undefined,
  };
};

export const saveAuthUser = (user: StoredAuthUser) => {
  const payload = normalizeStoredUser(user);
  if (!payload) return;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload));
};

export const getStoredAuthUser = (): StoredAuthUser | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return normalizeStoredUser(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const clearAuthUser = () => localStorage.removeItem(AUTH_USER_KEY);

export const resetApiFailureTracker = () => {
  failureTracker.clear();
};

export const setLoginMessage = (message: string) => {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(LOGIN_MESSAGE_KEY, message);
};

export const consumeLoginMessage = () => {
  if (typeof sessionStorage === "undefined") return null;
  const message = sessionStorage.getItem(LOGIN_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(LOGIN_MESSAGE_KEY);
  }
  return message;
};

export const clearAppStorage = () => {
  if (typeof localStorage !== "undefined") {
    clearToken();
    clearAuthUser();
    localStorage.removeItem(PLANNING_STORAGE_KEY);
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(LOGIN_MESSAGE_KEY);
  }
  resetApiFailureTracker();
};

export const logoutAndRedirect = (message?: string) => {
  clearAppStorage();
  if (message) {
    setLoginMessage(message);
  }
  redirectToLogin();
};

const redirectToLogin = () => {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

const parseErrorMessage = (error: AxiosError<ApiErrorResponse>) => {
  const responseData = error.response?.data;
  if (responseData && typeof responseData === "object") {
    return responseData.message || responseData.error;
  }

  if (typeof error.response?.data === "string") {
    return error.response.data;
  }

  return error.message || "Nao foi possivel completar a requisicao.";
};

const resolveFullUrl = (config: AxiosRequestConfig) => {
  const url = (config.url ?? "").toString();
  const isAbsolute = /^https?:\/\//i.test(url);
  if (isAbsolute) return url;

  const base = (config.baseURL ?? apiBaseURL).replace(/\/+$/, "");
  const trimmedUrl = url.replace(/^\/+/, "");
  return trimmedUrl ? `${base}/${trimmedUrl}` : base;
};

const extractPathname = (fullUrl: string) => {
  try {
    return new URL(fullUrl).pathname || "/";
  } catch {
    const withoutProto = fullUrl.replace(/^https?:\/\/[^/]+/i, "");
    return withoutProto || "/";
  }
};

const buildEndpointKey = (config: AxiosRequestConfig) => {
  const fullUrl = resolveFullUrl(config);
  const method = (config.method ?? "GET").toUpperCase();
  const path = extractPathname(fullUrl);
  return `${method} ${path}`;
};

const isBlockedEndpoint = (key: string, now: number) => {
  const info = failureTracker.get(key);
  if (!info?.blockedUntil) return false;

  if (info.blockedUntil <= now) {
    info.blockedUntil = undefined;
    info.timestamps = info.timestamps.filter((ts) => ts >= now - FAILURE_WINDOW_MS);
    failureTracker.set(key, info);
    return false;
  }
  return true;
};

const recordFailure = (key: string, now: number) => {
  const info = failureTracker.get(key) ?? { timestamps: [] };
  info.timestamps = info.timestamps.filter((ts) => ts >= now - FAILURE_WINDOW_MS);
  info.timestamps.push(now);

  let justBlocked = false;
  if (info.timestamps.length > FAILURE_LIMIT) {
    info.blockedUntil = now + BLOCK_DURATION_MS;
    justBlocked = true;
  }

  failureTracker.set(key, info);
  return { justBlocked, blockedUntil: info.blockedUntil };
};

if (shouldLogApi) {
  const suffixNote = apiHadApiSuffix ? " (sufixo /api removido)" : "";
  // eslint-disable-next-line no-console
  console.info("[api] baseURL ativo:", apiBaseURL + suffixNote);
}

api.interceptors.request.use((config) => {
  const now = Date.now();
  const endpointKey = buildEndpointKey(config);

  if (isBlockedEndpoint(endpointKey, now)) {
    const message = "Endpoint temporariamente bloqueado apos falhas repetidas.";
    if (shouldLogApi) {
      // eslint-disable-next-line no-console
      console.warn("[api] blocked request:", endpointKey);
    }
    return Promise.reject(new Error(message));
  }

  const token = getStoredToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }

  if (shouldLogApi) {
    const method = (config.method ?? "GET").toUpperCase();
    // eslint-disable-next-line no-console
    console.info("[api] request:", method, resolveFullUrl(config));
  }

  (config as AxiosRequestConfig & { __endpointKey?: string }).__endpointKey = endpointKey;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const fullUrl = resolveFullUrl(error.config ?? {});
    const path = extractPathname(fullUrl);
    const endpointKey =
      (error.config as AxiosRequestConfig & { __endpointKey?: string })?.__endpointKey ||
      buildEndpointKey(error.config ?? {});
    const now = Date.now();

    if (shouldLogApi) {
      const payload = error.response?.data ?? error.message;
      // eslint-disable-next-line no-console
      console.warn("[api] error:", status ?? "no-status", fullUrl, payload);
    }

    if (status === 401) {
      if (path === "/api/auth/login") {
        const authError = new Error("Credenciais invalidas.") as Error & { status?: number };
        authError.status = status;
        return Promise.reject(authError);
      }
      logoutAndRedirect("Sessao expirada, faca login novamente.");
      const authError = new Error("Sessao expirada ou nao autenticado.") as Error & {
        status?: number;
      };
      authError.status = status;
      return Promise.reject(authError);
    }

    if (status === 404) {
      const { justBlocked, blockedUntil } = recordFailure(endpointKey, now);
      if (justBlocked && shouldLogApi) {
        // eslint-disable-next-line no-console
        console.warn("[API BLOCKED] retry loop detected for", endpointKey, "until", blockedUntil);
      }
      const notFoundError = new Error(
        "Endpoint nao encontrado. Verifique VITE_API_URL e paths /api.",
      ) as Error & { status?: number };
      notFoundError.status = status;
      return Promise.reject(notFoundError);
    }

    const apiError = new Error(parseErrorMessage(error)) as Error & { status?: number };
    if (typeof status === "number") {
      apiError.status = status;
    }
    return Promise.reject(apiError);
  },
);

export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await api.request<T>(config);
  return (response.data ?? null) as T;
};
