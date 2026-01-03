import { DEFAULT_PLANNING, type Planning } from "../types";

export const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const getMonthKey = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 7);
  }
  if (typeof value === "string" && value.length >= 7) {
    return value.slice(0, 7);
  }
  return new Date().toISOString().slice(0, 7);
};

// Mantido apenas como helper/fallback; a persistencia principal agora e via API.
export const loadPlanning = (): Planning => ({ ...DEFAULT_PLANNING });
