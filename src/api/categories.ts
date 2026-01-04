import { apiRequest } from "./client";
import type { CategoriesResponse } from "../types";

export const listCategories = () =>
  apiRequest<CategoriesResponse>({
    url: "/api/categories",
    method: "GET",
  });
