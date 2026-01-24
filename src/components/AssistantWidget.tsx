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
const WIDGET_STATE_KEY = "assistantWidgetState";
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

const AssistantWidget = () => {
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
  const [widgetState, setWidgetState] = useState<"collapsed" | "expanded">(() => {
    if (typeof window === "undefined") return "collapsed";
    const stored = localStorage.getItem(WIDGET_STATE_KEY);
    return stored === "expanded" ? "expanded" : "collapsed";
  });
  const isExpanded = widgetState === "expanded";
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<AssistantAction[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      setConversationId(storedId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedMonth", month);
  }, [month]);

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
    localStorage.setItem(WIDGET_STATE_KEY, widgetState);
  }, [widgetState]);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    } else {
      toggleButtonRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded || typeof window === "undefined") return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setWidgetState("collapsed");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  const renderCard = (card: AssistantCard, index: number) => {
    const baseClass =
      "rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm shadow-slate-900/5";
    if (card.type === "metric") {
      return (
        <div key={`${card.type}-${index}`} className={baseClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{card.title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
          {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
        </div>
      );
    }
    if (card.type === "list") {
      const listItems = Array.isArray(card.items) ? card.items : [];
      return (
        <div key={`${card.type}-${index}`} className={baseClass}>
          <p className="text-xs font-semibold text-slate-900">{card.title}</p>
          {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {listItems.map((item, itemIndex) => (
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
            {(Array.isArray(card.fields) ? card.fields : []).map((field) => (
              <div key={field.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{field.label}</span>
                <span className="font-semibold text-slate-900">{field.value}</span>
              </div>
            ))}
          </div>
      </div>
    );
  };

  const handleExpand = useCallback(() => {
    logAssistant("assistant open");
    setWidgetState("expanded");
  }, []);

  const handleCollapse = useCallback(() => {
    logAssistant("assistant close");
    setWidgetState("collapsed");
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
      const safeCards = Array.isArray(response.cards) ? response.cards : [];
      const safeSuggestedActions = Array.isArray(response.suggestedActions)
        ? response.suggestedActions
        : [];
      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        from: "assistant",
        text: response.assistantMessage,
        cards: safeCards,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSuggestedActions(safeSuggestedActions);
    } catch (error) {
      logAssistant("assistant error", error);
      const assistantErrorMessage: AssistantMessage = {
        id: `assistant-error-${Date.now()}`,
        from: "assistant",
        text: "Não consegui responder agora. Tente novamente.",
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
  const overlayTransitionClass = prefersReducedMotion ? "" : "transition-opacity duration-200 ease-out";
  const panelTransitionClass = prefersReducedMotion ? "" : "transition-all duration-200 ease-out";

  const panelStateClasses = isExpanded
    ? "translate-y-0 opacity-100"
    : "translate-y-6 opacity-0 pointer-events-none";

  const safeMessages = messages ?? [];
  const safeSuggestedActions = suggestedActions ?? [];

  return (
    <>
      <div
        aria-hidden={!isExpanded}
        className={`fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 ${isExpanded ? "" : "pointer-events-none"}`}
      >
        <div
          className={`${overlayTransitionClass} absolute inset-0 bg-slate-900/40`}
          style={{ opacity: isExpanded ? 1 : 0 }}
          aria-hidden="true"
          onClick={handleCollapse}
        />
        <div
          role="dialog"
          aria-label="Assistente"
          aria-modal="true"
          id="assistant-widget-panel"
          className={`relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl ${panelTransitionClass} ${panelStateClasses} ${prefersReducedMotion ? "transition-none" : ""}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 rounded-t-3xl border-b border-slate-100 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-2xl">
                🙂
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assistente</p>
                <p className="text-sm font-semibold text-slate-900">Conversa inteligente</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCollapse}
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
          <div className="flex h-[70vh] min-h-[360px] flex-col">
            <div
              ref={scrollRef}
              aria-live="polite"
              className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm leading-relaxed"
            >
              {safeMessages.map((message) => {
                const messageCards = Array.isArray(message.cards) ? message.cards : [];
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-2 ${message.from === "user" ? "items-end" : ""}`}
                  >
                    <div
                      className={`max-w-full rounded-2xl border px-4 py-3 text-sm ${
                        message.from === "user"
                          ? "bg-primary text-white border-primary/60"
                          : "bg-slate-50 border border-slate-200 text-slate-900"
                      }`}
                    >
                      {(message.text ?? "")
                        .split("\n")
                        .map((segment, index) => (
                          <p key={`${message.id}-${index}`} className={index ? "mt-1" : ""}>
                            {segment}
                          </p>
                        ))}
                    </div>
                    {messageCards.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {messageCards.map(renderCard)}
                      </div>
                    )}
                  </div>
                );
              })}
              {isTyping && (
                <div className="max-w-[70%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Digitando...
                </div>
              )}
            </div>
            {safeSuggestedActions.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Sugestões</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {safeSuggestedActions.map((action) => (
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

      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom,1rem)]`}
      >
        <button
          ref={toggleButtonRef}
          type="button"
          aria-expanded={isExpanded}
          aria-controls="assistant-widget-panel"
          aria-label="Abrir assistente"
          onClick={handleExpand}
          className="group w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 py-3 text-left shadow-lg shadow-slate-200 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-2xl">
                🙂
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Assistente</p>
                <p className="text-xs text-slate-500">Pergunte sobre seu mês</p>
              </div>
            </div>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition group-hover:border-primary"
              aria-hidden="true"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 stroke-slate-600" strokeWidth="1.5">
                <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </button>
      </div>
    </>
  );
};

export default AssistantWidget;
