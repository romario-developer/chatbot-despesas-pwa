import axios from "axios";

const rawBaseUrl = (import.meta.env.VITE_API_URL ?? "").trim();

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const baseWithoutApi = (() => {
  const cleaned = stripTrailingSlash(rawBaseUrl);
  return cleaned.toLowerCase().endsWith("/api") ? cleaned.slice(0, -4) : cleaned;
})();

export const apiBaseURL = baseWithoutApi || window.location.origin;

export const api = axios.create({
  baseURL: apiBaseURL,
  headers: { "Content-Type": "application/json" },
});
