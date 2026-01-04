import type { AxiosError, AxiosRequestConfig } from "axios";
import { api, apiBaseURL, apiHadApiSuffix, shouldLogApi } from "../services/api";

const AUTH_TOKEN_KEY = "despesas_token";
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

export const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const saveToken = (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token);

export const clearToken = () => localStorage.removeItem(AUTH_TOKEN_KEY);

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
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
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
      clearToken();
      redirectToLogin();
      const { justBlocked, blockedUntil } = recordFailure(endpointKey, now);
      if (justBlocked && shouldLogApi) {
        // eslint-disable-next-line no-console
        console.warn("[API BLOCKED] retry loop detected for", endpointKey, "until", blockedUntil);
      }
      return Promise.reject(new Error("Sessao expirada ou nao autenticado."));
    }

    if (status === 404) {
      const { justBlocked, blockedUntil } = recordFailure(endpointKey, now);
      if (justBlocked && shouldLogApi) {
        // eslint-disable-next-line no-console
        console.warn("[API BLOCKED] retry loop detected for", endpointKey, "until", blockedUntil);
      }
      return Promise.reject(
        new Error("Endpoint nao encontrado. Verifique VITE_API_URL e paths /api."),
      );
    }

    return Promise.reject(new Error(parseErrorMessage(error)));
  },
);

export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await api.request<T>(config);
  return (response.data ?? null) as T;
};
