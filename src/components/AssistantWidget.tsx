import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { postAssistantMessage, type AssistantAction, type AssistantCard } from "../api/assistant";
import { getCurrentMonthInTimeZone } from "../utils/months";
import useViewportVh from "../hooks/useViewportVh";

const STORAGE_KEY = "assistantConversationId";
const WIDGET_STATE_KEY = "assistantWidgetState";
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [lastUiHint, setLastUiHint] = useState<AssistantUiHint | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<AssistantAction[]>([]);
  const [enteringMessageId, setEnteringMessageId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth < 768;
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatRootRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useViewportVh(isMobileView);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobileView(mediaQuery.matches);
    handleChange();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isMobileView || !isExpanded) {
      document.body.classList.remove("chat-lock-scroll");
      return;
    }
    document.body.classList.add("chat-lock-scroll");
    return () => {
      document.body.classList.remove("chat-lock-scroll");
    };
  }, [isMobileView, isExpanded]);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobileView || !isExpanded) {
      if (chatRootRef.current) {
        chatRootRef.current.style.height = "";
        chatRootRef.current.style.top = "";
        chatRootRef.current.style.bottom = "";
        chatRootRef.current.style.removeProperty("--composer-safe");
      }
      return undefined;
    }
    const targetHeight = Math.min(window.innerHeight * 0.82, 640);
    const vv = window.visualViewport;
    const applyVisualViewport = () => {
      if (!chatRootRef.current) return;
      const visibleHeight = vv?.height ?? window.innerHeight;
      const keyboardOpen = vv ? visibleHeight < window.innerHeight - 50 : false;
      const nextHeight = Math.max(320, Math.min(targetHeight, visibleHeight - 8));
      chatRootRef.current.style.height = `${nextHeight}px`;
      chatRootRef.current.style.bottom = "0px";
      chatRootRef.current.style.top = "auto";
      chatRootRef.current.style.setProperty("--composer-safe", keyboardOpen ? "0px" : "env(safe-area-inset-bottom)");
    };
    applyVisualViewport();
    if (vv) {
      vv.addEventListener("resize", applyVisualViewport);
      vv.addEventListener("scroll", applyVisualViewport);
      return () => {
        vv.removeEventListener("resize", applyVisualViewport);
        vv.removeEventListener("scroll", applyVisualViewport);
        if (chatRootRef.current) {
          chatRootRef.current.style.height = "";
          chatRootRef.current.style.bottom = "";
          chatRootRef.current.style.removeProperty("--composer-safe");
        }
      };
    }
    return () => {
      if (chatRootRef.current) {
        chatRootRef.current.style.height = "";
        chatRootRef.current.style.bottom = "";
        chatRootRef.current.style.removeProperty("--composer-safe");
      }
    };
  }, [isMobileView, isExpanded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      setConversationId(storedId);
    }
  }, []);

  const scrollMessagesInstant = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  const scrollToLatestMessage = useCallback(() => {
    if (typeof window === "undefined") {
      scrollMessagesInstant();
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollMessagesInstant();
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    });
  }, [scrollMessagesInstant, messagesEndRef]);

  // Keep the textarea under three lines (≈96px) so it never overwhelms the viewport.
  const adjustInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      const maxHeight = 96;
      const nextHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${nextHeight}px`;
      resizeFrameRef.current = null;
    };
    if (typeof window === "undefined") {
      resize();
      return;
    }
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(resize);
  }, []);

  const handleInputFocus = useCallback(() => {
    if (typeof window === "undefined") return;
    if (focusScrollTimeoutRef.current) {
      window.clearTimeout(focusScrollTimeoutRef.current);
    }
    // Delay scroll until the keyboard finishes sliding up so the input stays visible.
    focusScrollTimeoutRef.current = window.setTimeout(() => {
      scrollToLatestMessage();
    }, 300);
  }, [scrollToLatestMessage]);

  useEffect(() => {
    scrollToLatestMessage();
  }, [messages, isTyping, scrollToLatestMessage]);

  useEffect(() => {
    if (!messages.length) {
      setEnteringMessageId(null);
      return;
    }
    const lastId = messages[messages.length - 1].id;
    setEnteringMessageId((prev) => (prev === lastId ? prev : lastId));
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (conversationId) {
      localStorage.setItem(STORAGE_KEY, conversationId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [conversationId]);

  useEffect(() => {
    adjustInputHeight();
  }, [inputValue, adjustInputHeight]);

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

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      if (focusScrollTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(focusScrollTimeoutRef.current);
        focusScrollTimeoutRef.current = null;
      }
      if (resizeFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      setToastMessage(null);
    }
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
    if (autoCloseTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
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
    if (autoCloseTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
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
      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        from: "assistant",
        text: response.assistantMessage,
        cards: safeCards,
      };
      setCurrentStage(stage);
      setLastUiHint(uiHint);
      setAssistantCards(safeCards);
      setSuggestedActions(safeSuggestedActions);
      const toastSummary =
        uiHint?.summary ?? summarizeAssistantText(response.assistantMessage) ?? "Registrado";
      if (isSavedStage) {
        if (toastSummary) {
          setToastMessage(toastSummary);
        }
        if (typeof window !== "undefined") {
          autoCloseTimerRef.current = window.setTimeout(() => {
            setWidgetState("collapsed");
            setToastMessage(null);
            autoCloseTimerRef.current = null;
          }, 700);
        }
      } else {
        setToastMessage(null);
        setMessages((prev) => {
          const next = [...prev, assistantMessage];
          return next.length > 14 ? next.slice(-14) : next;
        });
      }
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
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    handleSendMessage(trimmed);
  };

  const handleSuggestedAction = (action: AssistantAction) => {
    const payload = action.prompt?.trim() || action.label;
    handleSendMessage(payload);
    inputRef.current?.focus();
  };

  const overlayTransitionClass = prefersReducedMotion ? "" : "transition-opacity duration-200 ease-out";
  const panelTransitionClass = prefersReducedMotion ? "" : "transition-all duration-200 ease-out";

  const panelStateClasses = isExpanded
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  const panelLayoutStyle = isMobileView
    ? {
        height: "var(--chat-vh, calc(var(--vh, 1vh) * 82))",
        bottom: "0px",
      }
    : {
        minHeight: "320px",
      };

  const actionGroups = useMemo(() => categorizeSuggestedActions(suggestedActions), [suggestedActions]);
  const { paymentActions, cardActions, categoryActions, adjustmentActions } = actionGroups;
  const hasQuickActionGroups =
    paymentActions.length > 0 || cardActions.length > 0 || categoryActions.length > 0;
  const isSavedStageRendered =
    currentStage === "saved" || lastUiHint?.kind === "saved";
  const shouldShowQuickActions = !isSavedStageRendered && hasQuickActionGroups;
  const quickActionChipClassName =
    "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70";
  const adjustmentChipClassName =
    "rounded-full border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-slate-900/40 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

  return (
    <>
      <div
        aria-hidden={!isExpanded}
        className={`fixed inset-0 z-50 ${isExpanded ? "" : "pointer-events-none"}`}
      >
        <div
          className={`${overlayTransitionClass} absolute inset-0 z-40 bg-slate-900/40`}
          style={{ opacity: isExpanded ? 1 : 0 }}
          aria-hidden="true"
          onClick={handleCollapse}
        />
        <div
          role="dialog"
          aria-label="Assistente"
          aria-modal="true"
          id="assistant-widget-panel"
          ref={chatRootRef}
          className={`fixed left-0 right-0 bottom-0 z-[52] flex h-full flex-col overflow-hidden rounded-t-[24px] bg-white ${panelTransitionClass} ${panelStateClasses} ${prefersReducedMotion ? "transition-none" : ""} md:inset-auto md:right-4 md:bottom-4 md:left-auto md:w-[380px] md:max-h-[70vh] md:h-auto md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl`}
          style={panelLayoutStyle}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative flex items-center justify-between gap-3 rounded-t-3xl border-b border-slate-100 px-4 py-3">
            <div className="absolute inset-x-0 top-2 flex justify-center md:hidden">
              <span className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
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
            {toastMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm">
                {toastMessage}
              </div>
            )}
            {!isSavedStageRendered && adjustmentActions.length > 0 && (
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
            {/* Overscroll behavior keeps the scroll chain inside the chat panel. */}
            <div
              ref={scrollRef}
              aria-live="polite"
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-3 text-sm leading-relaxed overscroll-contain scroll-smooth"
              style={{ minHeight: 0, WebkitOverflowScrolling: "touch" }}
            >
              {messages.length === 0 && !isTyping ? (
                <p className="text-xs leading-relaxed text-slate-500">Exemplos: mercado 50 • uber 23,90 crédito inter</p>
              ) : (
                messages.map((message) => {
                  const isUser = message.from === "user";
                  const shouldAnimateMessage =
                    !prefersReducedMotion && message.id === enteringMessageId;
                  // Skip animation when the user prefers reduced motion.
                  const messageWrapperClass = [
                    "assistant-message",
                    shouldAnimateMessage ? "assistant-message-enter" : "",
                    "flex flex-col gap-2",
                    isUser ? "items-end" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div key={message.id} className={messageWrapperClass}>
                      <div
                        className={`max-w-full rounded-2xl border px-4 py-3 text-sm ${
                          isUser
                            ? "border-primary/60 bg-primary text-white"
                            : "border-slate-200 bg-slate-50 text-slate-900"
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
                    </div>
                  );
                })
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
                <div ref={messagesEndRef} aria-hidden="true" className="h-px w-full" />
              </div>
            <div
              className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3"
              style={{ paddingBottom: "var(--composer-safe, env(safe-area-inset-bottom,1rem))" }}
            >
              {shouldShowQuickActions && (
                <div className="mt-3 max-h-[170px] overflow-y-auto pr-1">
                  <div className="space-y-3">
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
                </div>
              )}
              <form ref={formRef} onSubmit={handleSubmit} className="mt-4">
                <div className="flex items-center gap-3">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        formRef.current?.requestSubmit();
                      }
                    }}
                    placeholder="Digite uma despesa… (ex: mercado 50)"
                    className="flex-1 min-h-[44px] max-h-[96px] resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    style={{ maxHeight: "min(96px, calc(var(--vh, 1vh) * 25))" }}
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
