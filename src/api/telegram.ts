import { apiRequest } from "./client";

export type TelegramLinkCodeResponse = {
  code: string;
  expiresAt?: string;
};

export const createTelegramLinkCode = () => {
  return apiRequest<TelegramLinkCodeResponse>({
    url: "/api/telegram/link-code",
    method: "POST",
  });
};
