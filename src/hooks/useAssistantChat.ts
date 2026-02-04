import { useCallback, useEffect, useMemo, useState } from "react";
import { postAssistantMessage, type AssistantAction, type AssistantCard } from "../api/assistant";
import { formatMonthLabel, getCurrentMonthInTimeZone } from "../utils/months";
import { formatBRL } from "../utils/format";
import { invalidateCachesForMonth, invalidateCardsSummary } from "../services/cacheKeys";
import { notifyEntriesChanged } from "../utils/entriesEvents";

const PAYMENT_KEYWORDS = ["pix", "débito", "debito", "crédito", "credito", "dinheiro"];
const ADJUST_KEYWORDS = ["desfazer", "trocar", "ajustar"];
const CARD_HINTS = [
  "cartão",
  "cartao",
  "visa",
  "mastercard",
  "amex",
  "nubank",
  "inter",
  "itau",
  "itaú",
  "bradesco",
  "banco do brasil",
  "santander",
  "c6",
  "credicard",
  "cielo",
  "digio",
  "neon",
  "pan",
];

type AssistantMessage = {
  id: string;
  from: "user" | "assistant";
  text: string;
  cards?: AssistantCard[];
};

type AssistantUiHint = {
  kind?: string;
  summary?: string;
};

type AssistantActionBuckets = {
  paymentActions: AssistantAction[];
  cardActions: AssistantAction[];
  categoryActions: AssistantAction[];
  adjustmentActions: AssistantAction[];
};

const categorizeSuggestedActions = (actions: AssistantAction[]): AssistantActionBuckets => {
  const paymentActions: AssistantAction[] = [];
  const cardActions: AssistantAction[] = [];
  const categoryActions: AssistantAction[] = [];
  const adjustmentActions: AssistantAction[] = [];

  actions.forEach((action) => {
    const label = action.label?.toLowerCase() ?? "";
    const prompt = action.prompt?.toLowerCase() ?? "";
    const matchesAdjustment = ADJUST_KEYWORDS.some((keyword) => label.includes(keyword) || prompt.includes(keyword));
    if (matchesAdjustment) {
      adjustmentActions.push(action);
      return;
    }
    const matchesPayment = PAYMENT_KEYWORDS.some((keyword) => label.includes(keyword) || prompt.includes(keyword));
    if (matchesPayment) {
      paymentActions.push(action);
      return;
    }
    const matchesCardHint = CARD_HINTS.some((keyword) => label.includes(keyword) || prompt.includes(keyword));
    if (matchesCardHint) {
      cardActions.push(action);
      return;
    }
    categoryActions.push(action);
  });

  return {
    paymentActions,
    cardActions,
    categoryActions: categoryActions.slice(0, 3),
    adjustmentActions,
  };
};

const summarizeAssistantText = (text?: string) => {
  if (!text) return null;
  const firstLine = text
    .split("\n")
    .map((segment) => segment.trim())
    .find(Boolean);
  if (!firstLine) return null;
  const normalized = firstLine.replace(/\s+/g, " ").trim();
  return normalized.length > 90 ? `${normalized.slice(0, 90).trim()}…` : normalized;
};

const resolveInitialMonth = () => {
  if (typeof window === "undefined") return getCurrentMonthInTimeZone("America/Bahia");
  const currentMonthValue = getCurrentMonthInTimeZone("America/Bahia");
  const stored = window.localStorage.getItem("selectedMonth");
  return stored ?? currentMonthValue;
};

const STORAGE_KEY = "assistantConversationId";

export type UseAssistantChatOptions = {
  onSavedStage?: () => void;
};

export const useAssistantChat = ({ onSavedStage }: UseAssistantChatOptions = {}) => {
  const [month] = useState(resolveInitialMonth);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantCards, setAssistantCards] = useState<AssistantCard[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [lastUiHint, setLastUiHint] = useState<AssistantUiHint | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<AssistantAction[]>([]);
  const [enteringMessageId, setEnteringMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = window.localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      setConversationId(storedId);
    }
  }, []);

  useEffect(() => {
    if (conversationId) {
      window.localStorage.setItem(STORAGE_KEY, conversationId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!messages.length) {
      setEnteringMessageId(null);
      return;
    }
    const lastId = messages[messages.length - 1].id;
    setEnteringMessageId((prev) => (prev === lastId ? prev : lastId));
  }, [messages]);

  const handleSendMessage = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isSending) return;
      const userMessage: AssistantMessage = {
        id: `user-${Date.now()}`,
        from: "user",
        text: trimmed,
      };
      setMessages((prev) => {
        const next = [...prev, userMessage];
        return next.length > 12 ? next.slice(-12) : next;
      });
      setInputValue("");
      setIsTyping(true);
      setIsSending(true);
      setAssistantCards([]);
      setToastMessage(null);
      setSuggestedActions([]);

      try {
        const response = await postAssistantMessage({
          message: trimmed,
          month,
          conversationId: conversationId ?? undefined,
        });
        if (response.conversationId) {
          setConversationId(response.conversationId);
        }
        const safeCards = Array.isArray(response.cards) ? response.cards : [];
        const safeSuggestedActions = Array.isArray(response.suggestedActions)
          ? response.suggestedActions
          : [];
        const stage = response.state?.stage ?? null;
        const uiHint = response.uiHint ?? null;
        const isSavedStage = stage === "saved" || uiHint?.kind === "saved";
        const planningHint = uiHint?.planning;
        const isPlanningAction = uiHint?.kind === "planning" && planningHint;
        const formatPlanningAmount = (value?: number | string) => {
          const amount = Number(value ?? 0);
          return Number.isFinite(amount) ? formatBRL(amount) : "R$ 0,00";
        };
        const planningMessage =
          isPlanningAction && planningHint
            ? (() => {
                const monthLabel = planningHint.month
                  ? formatMonthLabel(planningHint.month)
                  : formatMonthLabel(month);
                const amountText = formatPlanningAmount(planningHint.amount);
                const label = planningHint.label?.trim();
                switch (planningHint.action) {
                  case "set_salary":
                    return `Salário de ${monthLabel} definido: ${amountText}`;
                  case "add_extra_income":
                    return `Entrada extra em ${monthLabel}: ${amountText}${
                      label ? ` (${label})` : ""
                    }`;
                  case "add_fixed_bill":
                    return `Conta fixa adicionada: ${label ?? "sem nome"} — ${amountText}`;
                  default:
                    return response.assistantMessage;
                }
              })()
            : response.assistantMessage;
        const actionMonth = planningHint?.month ?? month;
        const refreshCaches = () => {
          invalidateCachesForMonth(actionMonth);
          invalidateCardsSummary();
          notifyEntriesChanged(actionMonth);
        };
        if (isSavedStage || isPlanningAction) {
          refreshCaches();
        }
        const assistantMessage: AssistantMessage = {
          id: `assistant-${Date.now()}`,
          from: "assistant",
          text: planningMessage,
          cards: safeCards,
        };
        setCurrentStage(stage);
        setLastUiHint(uiHint);
        setAssistantCards(safeCards);
        setSuggestedActions(safeSuggestedActions);
        if (isPlanningAction && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("planning-updated"));
        }
        const toastSummary =
          uiHint?.summary ?? summarizeAssistantText(response.assistantMessage) ?? "Registrado";
        if (isSavedStage) {
          if (toastSummary) {
            setToastMessage(toastSummary);
          }
          onSavedStage?.();
        } else {
          setToastMessage(null);
          setMessages((prev) => {
            const next = [...prev, assistantMessage];
            return next.length > 14 ? next.slice(-14) : next;
          });
        }
      } catch (error) {
        const assistantErrorMessage: AssistantMessage = {
          id: `assistant-error-${Date.now()}`,
          from: "assistant",
          text: "Não consegui responder agora. Tente novamente.",
        };
        setMessages((prev) => {
          const next = [...prev, assistantErrorMessage];
          return next.length > 14 ? next.slice(-14) : next;
        });
        setSuggestedActions([]);
      } finally {
        setIsTyping(false);
        setIsSending(false);
      }
    },
    [conversationId, isSending, month, onSavedStage],
  );

  const handleSuggestedAction = useCallback(
    (action: AssistantAction) => {
      const payload = action.prompt?.trim() || action.label;
      handleSendMessage(payload);
    },
    [handleSendMessage],
  );

  const actionGroups = useMemo(() => categorizeSuggestedActions(suggestedActions), [suggestedActions]);

  return {
    assistantCards,
    actionGroups,
    enteringMessageId,
    handleSendMessage,
    handleSuggestedAction,
    inputValue,
    isSending,
    isTyping,
    messages,
    setInputValue,
    setToastMessage,
    toastMessage,
    suggestedActions,
    currentStage,
    lastUiHint,
    setCurrentStage,
    setLastUiHint,
  };
};
