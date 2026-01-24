import { apiRequest } from "./client";

export type AssistantCard =
  | {
      type: "metric";
      title: string;
      value: string;
      subtitle?: string;
    }
  | {
      type: "list";
      title: string;
      items: string[];
      subtitle?: string;
    }
  | {
      type: "summary";
      title: string;
      fields: Array<{ label: string; value: string }>;
      subtitle?: string;
    };

export type AssistantAction = {
  label: string;
  prompt?: string;
};

export type AssistantResponse = {
  assistantMessage: string;
  conversationId?: string;
  cards?: AssistantCard[];
  suggestedActions?: AssistantAction[];
};

export type AssistantRequest = {
  message: string;
  month?: string;
  conversationId?: string;
};

export const postAssistantMessage = async (
  payload: AssistantRequest,
): Promise<AssistantResponse> => {
  return apiRequest<AssistantResponse>({
    url: "/api/ai/chat",
    method: "POST",
    data: payload,
  });
};
