const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const AUTH_TOKEN_KEY = "despesas_token";

export const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const saveToken = (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token);

export const clearToken = () => localStorage.removeItem(AUTH_TOKEN_KEY);

const redirectToLogin = () => {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = API_BASE_URL || window.location.origin;
  const headers = new Headers(options.headers);
  const token = getStoredToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const hasBody = options.body !== undefined;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Nao foi possivel se conectar ao servidor.";
    throw new Error(message);
  }

  if (response.status === 401) {
    clearToken();
    redirectToLogin();
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.toLowerCase().includes("application/json");
  const text = await response.text();

  const parsed = isJson && text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })()
    : null;

  if (!response.ok) {
    const message =
      (parsed as { message?: string } | null)?.message ||
      (typeof parsed === "string" ? parsed : text) ||
      "Nao foi possivel completar a requisicao.";
    throw new Error(message);
  }

  if (!isJson) {
    return null as T;
  }

  return (parsed ?? null) as T;
}
