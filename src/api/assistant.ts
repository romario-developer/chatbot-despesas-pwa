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

export type PlanningUiHint = {
  action: "set_salary" | "add_extra_income" | "add_fixed_bill";
  amount?: number | string;
  label?: string;
  month?: string;
};

export type AssistantUiHint = {
  kind?: string;
  summary?: string;
  planning?: PlanningUiHint;
};

export type AssistantResponse = {
  assistantMessage: string;
  conversationId?: string;
  cards?: AssistantCard[];
  suggestedActions?: AssistantAction[];
  state?: {
    stage?: string;
  };
  uiHint?: AssistantUiHint;
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
