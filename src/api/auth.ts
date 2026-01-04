import { apiRequest } from "./client";
import type { AuthResponse } from "../types";

export const login = async (password: string): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>({
    url: "/api/auth/login",
    method: "POST",
    data: { password },
  });
};
