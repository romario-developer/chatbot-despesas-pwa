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

export type SignupPayload = {
  email: string;
  password: string;
};

export const signup = async (payload: SignupPayload): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>({
    url: "/api/auth/signup",
    method: "POST",
    data: payload,
  });
};

export const changePassword = (currentPassword: string, newPassword: string) => {
  return apiRequest<void>({
    url: "/api/me/password",
    method: "POST",
    data: { currentPassword, newPassword },
  });
};
