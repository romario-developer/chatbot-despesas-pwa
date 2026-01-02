import { apiFetch } from "./client";
import type { CategoriesResponse } from "../types";

export const listCategories = () => apiFetch<CategoriesResponse>("/api/categories");
