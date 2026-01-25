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
  state?: {
    stage?: string;
  };
  uiHint?: {
    kind?: string;
    summary?: string;
  };
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
    url: "/api/assistant/chat",
    method: "POST",
    data: payload,
  });
};
