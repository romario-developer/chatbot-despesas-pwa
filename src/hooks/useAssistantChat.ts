import { useCallback, useMemo, useState } from "react";
import { notifyEntriesChanged } from "../utils/entriesEvents";
import { getCurrentMonthInTimeZone } from "../utils/months";
import { chatWithAssistant } from "../api/assistant";
import type { AssistantAction } from "../api/assistant";

const STORAGE_KEY = "assistant_conversation_id";

export type ChatMessage = {
  id: string;
  author: "user" | "assistant" | "summary";
  text: string;
};

type SendOptions = {
  onActions?: (actions: AssistantAction[]) => void;
};

const defaultSuggestions = [
  "Quanto gastei esse mês?",
  "Desfazer último",
  "Registrar receita",
];

const readConversationId = () => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
};

const persistConversationId = (id: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
};

const resolveMonth = () => {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem("selectedMonth");
  if (stored) return stored;
  return getCurrentMonthInTimeZone("America/Bahia");
};

  const handleActions = (actions: AssistantAction[] | undefined) => {
    if (!actions?.length) return;
    const hasExpenseAction = actions.some((item) =>
      item.type.startsWith("expense_"),
    );
    if (hasExpenseAction) {
      notifyEntriesChanged();
    }
  };

  const resolveErrorMessageFromPayload = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return null;
    const data = payload as { message?: unknown; error?: unknown };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
    return null;
  };

export const useAssistantChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    readConversationId(),
  );
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");

  const sendMessage = useCallback(
    async (message: string, options?: SendOptions) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      setLastUserMessage(trimmed);
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        author: "user",
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      try {
        const month = resolveMonth();
        const payload = await chatWithAssistant({
          message: trimmed,
          conversationId,
          month,
        });

        setConversationId(payload.conversationId);
        persistConversationId(payload.conversationId);
        handleActions(payload.actions);
        options?.onActions?.(payload.actions);

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          author: "assistant",
          text: payload.assistantMessage,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (payload.actions?.length) {
          const summaryText = payload.actions
            .map((item) => item.summary)
            .filter(Boolean)
            .join(" • ");
          if (summaryText) {
            const summaryMessage: ChatMessage = {
              id: `summary-${Date.now()}`,
              author: "summary",
              text: summaryText,
            };
            setMessages((prev) => [...prev, summaryMessage]);
          }
        }

        setSuggestions(payload.suggestions ?? defaultSuggestions);
      } catch (err) {
        const apiError = err as Error & { payload?: unknown };
        const serverMessage =
          resolveErrorMessageFromPayload(apiError.payload) ??
          (err instanceof Error ? err.message : null);
        const friendly =
          serverMessage ||
          "Não consegui falar com o servidor agora. Tente novamente.";
        setError(friendly);
        const assistantMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          author: "assistant",
          text: friendly,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId],
  );

  const resetConversation = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setConversationId(undefined);
    setMessages([]);
    setSuggestions(defaultSuggestions);
  }, []);

  const hasMessages = useMemo(() => messages.length > 0, [messages]);

  return {
    messages,
    loading,
    error,
    suggestions,
    sendMessage,
    conversationId,
    lastUserMessage,
    resetConversation,
    hasMessages,
  };
};
