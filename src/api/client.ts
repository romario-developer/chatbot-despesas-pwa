import type { AxiosError, AxiosRequestConfig } from "axios";
import { api } from "../services/api";

const AUTH_TOKEN_KEY = "despesas_token";

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

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;

    if (status === 401) {
      clearToken();
      redirectToLogin();
      return Promise.reject(new Error("Credenciais inválidas ou token ausente."));
    }

    if (status === 404) {
      return Promise.reject(
        new Error("Endpoint não encontrado. Verifique VITE_API_URL e rota /api/auth/login."),
      );
    }

    return Promise.reject(new Error(parseErrorMessage(error)));
  },
);

export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await api.request<T>(config);
  return (response.data ?? null) as T;
};
