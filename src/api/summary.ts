import { apiFetch } from "./client";
import type { Summary } from "../types";

export const getSummary = (month: string) => {
  const search = new URLSearchParams({ month });
  return apiFetch<Summary>(`/api/summary?${search.toString()}`);
};
