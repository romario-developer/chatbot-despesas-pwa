const rawBaseUrl = (import.meta.env.VITE_API_URL ?? "").trim();
export const rawApiUrl = rawBaseUrl;
const DEBUG_API = String(import.meta.env.VITE_DEBUG_API).toLowerCase() === "true";
export const shouldLogApi = Boolean(import.meta.env?.DEV || DEBUG_API);

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const cleanedBase = stripTrailingSlash(rawBaseUrl);
const baseHadApiSuffix = cleanedBase.toLowerCase().endsWith("/api");
const baseWithoutApi = baseHadApiSuffix ? cleanedBase.slice(0, -4) : cleanedBase;

export const apiBaseURL = baseWithoutApi || window.location.origin;
export const apiHadApiSuffix = baseHadApiSuffix;
