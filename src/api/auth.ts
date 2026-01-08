import { apiRequest } from "./client";
import type { AuthResponse } from "../types";

export type LoginPayload = {
  email: string;
  password: string;
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>({
    url: "/api/auth/login",
    method: "POST",
    data: payload,
  });
};
