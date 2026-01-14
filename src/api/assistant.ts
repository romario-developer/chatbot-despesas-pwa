import { apiRequest } from "./client";

export type AssistantAction = {
  type: string;
  entity: string;
  entityId?: string;
  summary?: string;
};

export type AssistantResponse = {
  conversationId: string;
  assistantMessage: string;
  actions: AssistantAction[];
  suggestions?: string[];
};

export type AssistantRequest = {
  message: string;
  conversationId?: string;
  month?: string;
};

export const chatWithAssistant = (payload: AssistantRequest) => {
  return apiRequest<AssistantResponse>({
    url: "/api/assistant/chat",
    method: "POST",
    data: payload,
  });
};
