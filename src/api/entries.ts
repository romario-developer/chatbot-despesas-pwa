import { apiRequest } from "./client";
import type { Entry, EntryPayload } from "../types";

export type ListEntriesParams = {
  from?: string;
  to?: string;
  category?: string;
  q?: string;
};

type EntriesApiResponse = Entry[] | { items?: Entry[] } | null;

export async function listEntries(params: ListEntriesParams = {}): Promise<Entry[]> {
  const search = new URLSearchParams();

  if (params.from) search.append("from", params.from);
  if (params.to) search.append("to", params.to);
  if (params.category) search.append("category", params.category);
  if (params.q) search.append("q", params.q);

  const query = search.toString();
  const path = query ? `/api/entries?${query}` : "/api/entries";

  const data = await apiRequest<EntriesApiResponse>({
    url: path,
    method: "GET",
  });

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

export const getEntry = (id: string) => {
  return apiRequest<Entry>({
    url: `/api/entries/${id}`,
    method: "GET",
  });
};

export const createEntry = (payload: EntryPayload) => {
  return apiRequest<Entry>({
    url: "/api/entries",
    method: "POST",
    data: payload,
  });
};

export const updateEntry = (id: string, payload: EntryPayload) => {
  return apiRequest<Entry>({
    url: `/api/entries/${id}`,
    method: "PUT",
    data: payload,
  });
};

export const deleteEntry = (id: string) => {
  return apiRequest<void>({
    url: `/api/entries/${id}`,
    method: "DELETE",
  });
};
