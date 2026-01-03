import { apiFetch } from "./client";

export type TelegramLinkCodeResponse = {
  code: string;
  expiresAt?: string;
};

export const createTelegramLinkCode = () => {
  return apiFetch<TelegramLinkCodeResponse>("/api/telegram/link-code", {
    method: "POST",
  });
};
