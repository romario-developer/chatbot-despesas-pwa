import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import MonthPicker, {
  MonthPickerFieldTrigger,
  monthPickerFieldButtonClassName,
} from "./MonthPicker";
import { postAssistantMessage, type AssistantAction, type AssistantCard } from "../api/assistant";
import {
  formatMonthLabel,
  getCurrentMonthInTimeZone,
  getDefaultMonthRange,
  isMonthInRange,
} from "../utils/months";

const STORAGE_KEY = "assistantConversationId";
const ASSISTANT_INTRO =
  "Oi! Quer analisar saldo, gastos, cartões ou planejamento?";
const INITIAL_MESSAGE_ID = "assistant-intro";

type AssistantMessage = {
  id: string;
  from: "user" | "assistant";
  text: string;
  cards?: AssistantCard[];
};

const INITIAL_ASSISTANT_MESSAGE: AssistantMessage = {
  id: INITIAL_MESSAGE_ID,
  from: "assistant",
  text: ASSISTANT_INTRO,
};

const logAssistant = (...args: unknown[]) => {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("DEBUG_ASSISTANT") === "1") {
    // eslint-disable-next-line no-console
    console.debug("[assistant-debug]", ...args);
  }
};

const AssistantFAB = () => {
  const currentMonthValue = useMemo(
    () => getCurrentMonthInTimeZone("America/Bahia"),
    [],
  );
  const monthRange = useMemo(
    () => getDefaultMonthRange({ endMonth: currentMonthValue, monthsBack: 24 }),
    [currentMonthValue],
  );
  const [month, setMonth] = useState(() => {
    if (typeof window === "undefined") return currentMonthValue;
    const stored = localStorage.getItem("selectedMonth");
    if (stored && isMonthInRange(stored, monthRange.start, monthRange.end)) {
      return stored;
    }
    return currentMonthValue;
  });
  const [chatOpen, setChatOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<AssistantAction[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      setConversationId(storedId);
    }
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (conversationId) {
      localStorage.setItem(STORAGE_KEY, conversationId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [conversationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedMonth", month);
  }, [month]);

  useEffect(() => {
    if (chatOpen) {
      inputRef.current?.focus();
    }
  }, [chatOpen]);

  const renderCard = (card: AssistantCard, index: number) => {
    const baseClass =
      "rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm shadow-slate-900/5";
    if (card.type === "metric") {
      return (
        <div key={`${card.type}-${index}`} className={baseClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
            {card.title}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
          {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
        </div>
      );
    }
    if (card.type === "list") {
      return (
        <div key={`${card.type}-${index}`} className={baseClass}>
          <p className="text-xs font-semibold text-slate-900">{card.title}</p>
          {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {card.items.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`}>• {item}</li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <div key={`${card.type}-${index}`} className={baseClass}>
        <p className="text-xs font-semibold text-slate-900">{card.title}</p>
        {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
        <div className="mt-2 space-y-1">
          {card.fields.map((field) => (
            <div key={field.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{field.label}</span>
              <span className="font-semibold text-slate-900">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleOpen = useCallback(() => {
    logAssistant("assistant open");
    setChatOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    logAssistant("assistant close");
    setChatOpen(false);
  }, []);

  const handleSendMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      from: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);
    setIsSending(true);
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
      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        from: "assistant",
        text: response.assistantMessage,
        cards: response.cards,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSuggestedActions(response.suggestedActions ?? []);
    } catch (error) {
      logAssistant("assistant error", error);
      const assistantErrorMessage: AssistantMessage = {
        id: `assistant-error-${Date.now()}`,
        from: "assistant",
        text: "Não consegui responder agora.",
      };
      setMessages((prev) => [...prev, assistantErrorMessage]);
      setSuggestedActions([]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleSuggestedAction = (action: AssistantAction) => {
    const payload = action.prompt?.trim() || action.label;
    handleSendMessage(payload);
  };

  const monthLabel = useMemo(() => formatMonthLabel(month), [month]);

  const avatarClasses = useMemo(() => "rounded-full", []);
  const renderAvatar = useCallback(
    (size: string, textSize?: string) => (
      <span className={`${size} ${avatarClasses} flex items-center justify-center bg-primary text-white ${textSize ?? "text-2xl"}`}>
        🙂
      </span>
    ),
    [avatarClasses],
  );

  return (
    <>
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end px-4 pb-6 pt-4 sm:pb-8">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-md">
            <div className="flex items-center justify-between gap-3 rounded-t-3xl border-b border-slate-100 px-4 py-3">
              <div className="flex items-start gap-3">
                {renderAvatar("h-10 w-10")}
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assistente</p>
                  <p className="text-sm font-semibold text-slate-900">Conversa inteligente</p>
                  <p className="text-xs text-slate-500">Insights rápidos e personalizados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar assistente"
                className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <div className="px-4 pb-3 pt-2">
              <MonthPicker
                valueMonth={month}
                onChangeMonth={setMonth}
                minMonth={monthRange.start}
                maxMonth={monthRange.end}
                buttonClassName={monthPickerFieldButtonClassName}
                trigger={<MonthPickerFieldTrigger label={`Mês: ${monthLabel}`} />}
              />
            </div>
            <div className="flex h-[65vh] flex-col rounded-b-3xl bg-white">
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm leading-relaxed"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-2 ${
                      message.from === "user" ? "items-end" : ""
                    }`}
                  >
                    <div
                      className={`max-w-full rounded-2xl border px-4 py-3 text-sm ${
                        message.from === "user"
                          ? "bg-primary text-white border-primary/60"
                          : "bg-slate-50 border border-slate-200 text-slate-900"
                      }`}
                    >
                      {message.text.split("\n").map((segment, index) => (
                        <p key={`${message.id}-${index}`} className={index ? "mt-1" : ""}>
                          {segment}
                        </p>
                      ))}
                    </div>
                    {message.cards && message.cards.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {message.cards.map(renderCard)}
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="max-w-[70%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Digitando...
                  </div>
                )}
              </div>
              {suggestedActions.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Sugestões
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedActions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => handleSuggestedAction(action)}
                        className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="border-t border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage(inputValue);
                      }
                    }}
                    placeholder="Digite uma pergunta ou peça um insight..."
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isSending}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          paddingRight: "env(safe-area-inset-right, 0)",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
        className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2"
      >
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Assistente"
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {renderAvatar("h-10 w-10", "text-xl")}
          <span className="sr-only">Assistente</span>
        </button>
      </div>
    </>
  );
};

export default AssistantFAB;
