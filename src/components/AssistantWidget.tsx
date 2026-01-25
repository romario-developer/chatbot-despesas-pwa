import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { postAssistantMessage, type AssistantAction, type AssistantCard } from "../api/assistant";
import { getCurrentMonthInTimeZone } from "../utils/months";

const STORAGE_KEY = "assistantConversationId";
const WIDGET_STATE_KEY = "assistantWidgetState";
type AssistantMessage = {
  id: string;
  from: "user" | "assistant";
  text: string;
  cards?: AssistantCard[];
};

const logAssistant = (...args: unknown[]) => {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("DEBUG_ASSISTANT") === "1") {
    // eslint-disable-next-line no-console
    console.debug("[assistant-debug]", ...args);
  }
};

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

const AssistantWidget = () => {
  const currentMonthValue = useMemo(
    () => getCurrentMonthInTimeZone("America/Bahia"),
    [],
  );
  const [month] = useState(() => {
    if (typeof window === "undefined") return currentMonthValue;
    const stored = localStorage.getItem("selectedMonth");
    return stored ?? currentMonthValue;
  });
  const [widgetState, setWidgetState] = useState<"collapsed" | "expanded">(() => {
    if (typeof window === "undefined") return "collapsed";
    const stored = localStorage.getItem(WIDGET_STATE_KEY);
    return stored === "expanded" ? "expanded" : "collapsed";
  });
  const isExpanded = widgetState === "expanded";
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantCards, setAssistantCards] = useState<AssistantCard[]>([]);
  const [confirmationNote, setConfirmationNote] = useState<string | null>(null);
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
    setMessages((prev) => {
      const next = [...prev, userMessage];
      return next.length > 12 ? next.slice(-12) : next;
    });
    setInputValue("");
    setIsTyping(true);
    setIsSending(true);
    setAssistantCards([]);
    setConfirmationNote(null);
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
      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        return next.length > 14 ? next.slice(-14) : next;
      });
      setAssistantCards(safeCards);
      setConfirmationNote(summarizeAssistantText(response.assistantMessage));
      setSuggestedActions(safeSuggestedActions);
    } catch (error) {
      logAssistant("assistant error", error);
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
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleSuggestedAction = (action: AssistantAction) => {
    const payload = action.prompt?.trim() || action.label;
    handleSendMessage(payload);
    inputRef.current?.focus();
  };

  const overlayTransitionClass = prefersReducedMotion ? "" : "transition-opacity duration-200 ease-out";
  const panelTransitionClass = prefersReducedMotion ? "" : "transition-all duration-200 ease-out";

  const panelStateClasses = isExpanded
    ? "translate-y-0 opacity-100"
    : "translate-y-6 opacity-0 pointer-events-none";

  const userMessages = useMemo(
    () => messages.filter((message) => message.from === "user"),
    [messages],
  );
  const actionGroups = useMemo(() => categorizeSuggestedActions(suggestedActions), [suggestedActions]);
  const { paymentActions, cardActions, categoryActions, adjustmentActions } = actionGroups;
  const hasQuickActionGroups =
    paymentActions.length > 0 || cardActions.length > 0 || categoryActions.length > 0;
  const quickActionChipClassName =
    "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70";
  const adjustmentChipClassName =
    "rounded-full border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-slate-900/40 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

  return (
    <>
      <div
        aria-hidden={!isExpanded}
        className={`fixed inset-0 z-50 flex items-end ${isExpanded ? "pointer-events-auto" : "pointer-events-none"} justify-center md:justify-end`}
      >
        <div
          className={`${overlayTransitionClass} absolute inset-0 bg-slate-900/40`}
          style={{ opacity: isExpanded ? 1 : 0 }}
          aria-hidden="true"
          onClick={handleCollapse}
        />
        <div className="relative flex w-full justify-center md:justify-end">
          <div
            role="dialog"
            aria-label="Assistente"
            aria-modal="true"
            id="assistant-widget-panel"
            className={`relative mx-3 mb-4 flex w-full max-w-[420px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl ${panelTransitionClass} ${panelStateClasses} ${prefersReducedMotion ? "transition-none" : ""} max-h-[60vh] md:max-h-[70vh]`}
            style={{ minHeight: "320px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 rounded-t-3xl border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-2xl bg-primary text-white flex items-center justify-center text-lg">
                  🙂
                </span>
                <p className="text-sm font-semibold text-slate-900">Assistente</p>
              </div>
              <button
                type="button"
                onClick={handleCollapse}
                aria-label="Fechar assistente"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <div className="px-4 pt-3">
              {confirmationNote && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm">
                  {confirmationNote}
                </div>
              )}
              {adjustmentActions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {adjustmentActions.map((action) => (
                    <button
                      key={`adjust-${action.label}`}
                      type="button"
                      onClick={() => handleSuggestedAction(action)}
                      className={adjustmentChipClassName}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <div
                ref={scrollRef}
                aria-live="polite"
                className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed"
                style={{ minHeight: 0 }}
              >
                {userMessages.length === 0 && !isTyping ? (
                  <p className="text-xs leading-relaxed text-slate-500">Digite uma despesa… (ex: mercado 50)</p>
                ) : (
                  userMessages.map((message) => (
                    <div key={message.id} className="flex flex-col gap-2 items-end">
                      <div className="max-w-full rounded-2xl border border-primary/60 bg-primary px-4 py-3 text-sm font-semibold text-white">
                        {(message.text ?? "")
                          .split("\n")
                          .map((segment, index) => (
                            <p key={`${message.id}-${index}`} className={index ? "mt-1" : ""}>
                              {segment}
                            </p>
                          ))}
                      </div>
                    </div>
                  ))
                )}
                {assistantCards.length > 0 && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {assistantCards.map(renderCard)}
                  </div>
                )}
                {isTyping && (
                  <div className="mt-2 max-w-[70%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Digitando...
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 px-4 py-3 pb-[env(safe-area-inset-bottom,1rem)]">
                {hasQuickActionGroups && (
                  <div className="mt-3 space-y-3">
                    {paymentActions.length > 0 && (
                      <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Pagamento</p>
                        <div className="flex flex-wrap gap-2">
                          {paymentActions.map((action) => (
                            <button
                              key={`payment-${action.label}`}
                              type="button"
                              onClick={() => handleSuggestedAction(action)}
                              className={quickActionChipClassName}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                    {cardActions.length > 0 && (
                      <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Cartões</p>
                        <div className="flex flex-wrap gap-2">
                          {cardActions.map((action) => (
                            <button
                              key={`card-${action.label}`}
                              type="button"
                              onClick={() => handleSuggestedAction(action)}
                              className={quickActionChipClassName}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                    {categoryActions.length > 0 && (
                      <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Categorias sugeridas</p>
                        <div className="flex flex-wrap gap-2">
                          {categoryActions.map((action) => (
                            <button
                              key={`category-${action.label}`}
                              type="button"
                              onClick={() => handleSuggestedAction(action)}
                              className={quickActionChipClassName}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="mt-4">
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
                      placeholder="Digite uma despesa… (ex: mercado 50)"
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
        </div>
      </div>

      <div className="fixed inset-x-3 bottom-[env(safe-area-inset-bottom,1rem)] z-40 flex justify-center md:inset-auto md:bottom-4 md:right-4 md:justify-end">
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
                <p className="text-xs text-slate-500">Registrar despesas</p>
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
