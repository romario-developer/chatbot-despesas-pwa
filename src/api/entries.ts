import { apiFetch } from "./client";
import type { EntriesResponse } from "../types";

export type ListEntriesParams = {
  from?: string;
  to?: string;
  category?: string;
  q?: string;
};

export const listEntries = (params: ListEntriesParams = {}) => {
  const search = new URLSearchParams();

  if (params.from) search.append("from", params.from);
  if (params.to) search.append("to", params.to);
  if (params.category) search.append("category", params.category);
  if (params.q) search.append("q", params.q);

  const query = search.toString();
  const path = query ? `/api/entries?${query}` : "/api/entries";

  return apiFetch<EntriesResponse>(path);
};
