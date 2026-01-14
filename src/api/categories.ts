import { apiRequest } from "./client";
import type { Category, CategoriesResponse } from "../types";

export type ListCategoriesOptions = {
  active?: boolean | "all";
};

const normalizeCategory = (value: unknown): Category | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const id =
    typeof data.id === "string"
      ? data.id
      : typeof data._id === "string"
        ? data._id
        : typeof data.id === "number"
          ? String(data.id)
          : typeof data._id === "number"
            ? String(data._id)
            : undefined;
  if (!id) return null;

  const name =
    typeof data.name === "string" && data.name.trim()
      ? data.name.trim()
      : "";
  if (!name) return null;

  const isActive =
    typeof data.isActive === "boolean"
      ? data.isActive
      : typeof data.active === "boolean"
        ? data.active
        : undefined;

  return {
    id,
    name,
    isActive,
  };
};

const resolveCategoryList = (payload: CategoriesResponse): Category[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeCategory(item)).filter(Boolean) as Category[];
  }
  const list =
    Array.isArray(payload.categories)
      ? payload.categories
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.items)
          ? payload.items
          : [];
  return list.map((item) => normalizeCategory(item)).filter(Boolean) as Category[];
};

const buildQuery = (options: ListCategoriesOptions) => {
  const search = new URLSearchParams();
  if (options.active === true) {
    search.append("active", "true");
  } else if (options.active === false) {
    search.append("active", "false");
  }
  return search.toString();
};

export const listCategories = async (options: ListCategoriesOptions = {}): Promise<Category[]> => {
  const query = buildQuery(options);
  const path = query ? `/api/categories?${query}` : "/api/categories";
  const data = await apiRequest<CategoriesResponse>({
    url: path,
    method: "GET",
  });
  return resolveCategoryList(data);
};

export const createCategory = async (name: string): Promise<Category | null> => {
  const data = await apiRequest<Category | null>({
    url: "/api/categories",
    method: "POST",
    data: { name },
  });
  return normalizeCategory(data) ?? null;
};

export type UpdateCategoryPayload = {
  name?: string;
  isActive?: boolean;
};

export const updateCategory = async (
  id: string,
  payload: UpdateCategoryPayload,
): Promise<Category | null> => {
  const data = await apiRequest<Category | null>({
    url: `/api/categories/${id}`,
    method: "PATCH",
    data: payload,
  });
  return normalizeCategory(data) ?? null;
};

export const deleteCategory = async (id: string) => {
  await apiRequest<void>({
    url: `/api/categories/${id}`,
    method: "DELETE",
  });
};
