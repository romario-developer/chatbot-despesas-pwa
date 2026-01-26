import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AssistantCard } from "../api/assistant";
import { useAssistantChat } from "../hooks/useAssistantChat";
import { ASSISTANT_OPEN_EVENT } from "../constants/assistantEvents";

const WIDGET_STATE_KEY = "assistantWidgetState";
const logAssistant = (...args: unknown[]) => {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("DEBUG_ASSISTANT") === "1") {
    console.debug("[assistant-debug]", ...args);
  }
};

type AssistantWidgetProps = {
  onStateChange?: (isExpanded: boolean) => void;
};

const AssistantWidget = ({ onStateChange }: AssistantWidgetProps) => {
  const [widgetState, setWidgetState] = useState<"collapsed" | "expanded">(() => {
    if (typeof window === "undefined") return "collapsed";
    const stored = window.localStorage.getItem(WIDGET_STATE_KEY);
    return stored === "expanded" ? "expanded" : "collapsed";
  });
  const isExpanded = widgetState === "expanded";
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatRootRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const savedStageRef = useRef(false);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(WIDGET_STATE_KEY, widgetState);
  }, [widgetState]);

  useEffect(() => {
    if (!isExpanded) {
      toggleButtonRef.current?.focus();
      return;
    }
    if (typeof window === "undefined") {
      inputRef.current?.focus();
      return;
    }
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    });
  }, [isExpanded]);

  useEffect(() => {
    onStateChange?.(isExpanded);
  }, [isExpanded, onStateChange]);

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
    if (typeof window === "undefined") {
      chatRootRef.current?.style.removeProperty("--keyboard-offset");
      return;
    }
    if (!isExpanded) {
      chatRootRef.current?.style.removeProperty("--keyboard-offset");
      return;
    }
    const vv = window.visualViewport;
    const updateKeyboardOffset = () => {
      const visibleHeight = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const offset = Math.max(0, window.innerHeight - visibleHeight - offsetTop);
      chatRootRef.current?.style.setProperty("--keyboard-offset", `${offset}px`);
    };
    updateKeyboardOffset();
    vv?.addEventListener("resize", updateKeyboardOffset);
    vv?.addEventListener("scroll", updateKeyboardOffset);
    window.addEventListener("resize", updateKeyboardOffset);
    return () => {
      vv?.removeEventListener("resize", updateKeyboardOffset);
      vv?.removeEventListener("scroll", updateKeyboardOffset);
      window.removeEventListener("resize", updateKeyboardOffset);
      chatRootRef.current?.style.removeProperty("--keyboard-offset");
    };
  }, [isExpanded]);

  const {
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
    currentStage,
    lastUiHint,
    setCurrentStage,
    setLastUiHint,
  } = useAssistantChat();

  const orderedMessages = useMemo(() => {
    if (!messages.length) return messages;
    const hasNumericTs = messages.every((message) => {
      const raw = message as Record<string, unknown>;
      return typeof raw.ts === "number";
    });
    const hasCreatedAt = messages.every((message) => {
      const raw = message as Record<string, unknown>;
      const value = typeof raw.createdAt === "string" ? Date.parse(raw.createdAt) : NaN;
      return !Number.isNaN(value);
    });
    if (!hasNumericTs && !hasCreatedAt) {
      return messages;
    }
    const next = [...messages];
    const getTimestamp = (message: typeof messages[number]) => {
      const raw = message as Record<string, unknown>;
      if (typeof raw.ts === "number") return raw.ts;
      if (typeof raw.createdAt === "string") {
        const parsed = Date.parse(raw.createdAt);
        if (!Number.isNaN(parsed)) return parsed;
      }
      return 0;
    };
    next.sort((a, b) => getTimestamp(a) - getTimestamp(b));
    return next;
  }, [messages]);

  const { paymentActions, cardActions, categoryActions, adjustmentActions } = actionGroups;
  const hasQuickActionGroups =
    paymentActions.length > 0 || cardActions.length > 0 || categoryActions.length > 0;
  const isSavedStageRendered = currentStage === "saved" || lastUiHint?.kind === "saved";
  const shouldShowQuickActions = !isSavedStageRendered && hasQuickActionGroups;

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
  }, [scrollMessagesInstant]);

  useEffect(() => {
    scrollToLatestMessage();
  }, [messages, isTyping, scrollToLatestMessage]);

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

  useEffect(() => {
    adjustInputHeight();
  }, [inputValue, adjustInputHeight]);

  useEffect(() => {
    if (!isExpanded) {
      setToastMessage(null);
    }
  }, [isExpanded, setToastMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return () => {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      if (focusScrollTimeoutRef.current) {
        window.clearTimeout(focusScrollTimeoutRef.current);
        focusScrollTimeoutRef.current = null;
      }
      if (resizeFrameRef.current) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isSavedStageRendered || !isExpanded || typeof window === "undefined") {
      savedStageRef.current = false;
      return;
    }
    if (savedStageRef.current) return;
    savedStageRef.current = true;
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
    }
    autoCloseTimerRef.current = window.setTimeout(() => {
      autoCloseTimerRef.current = null;
      savedStageRef.current = false;
      if (typeof document !== "undefined" && document.activeElement === inputRef.current) {
        return;
      }
      setWidgetState("collapsed");
      setToastMessage(null);
    }, 700);
  }, [isSavedStageRendered, isExpanded, setToastMessage]);

  const handleExpand = useCallback(() => {
    savedStageRef.current = false;
    if (typeof window !== "undefined" && autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setCurrentStage(null);
    setLastUiHint(null);
    setToastMessage(null);
    logAssistant("assistant open");
    setWidgetState("expanded");
  }, [setCurrentStage, setLastUiHint, setToastMessage]);

  const handleCollapse = useCallback(() => {
    if (typeof window !== "undefined" && autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    logAssistant("assistant close");
    setWidgetState("collapsed");
    savedStageRef.current = false;
    setCurrentStage(null);
    setLastUiHint(null);
    setToastMessage(null);
  }, [setCurrentStage, setLastUiHint, setToastMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleAssistantOpen = () => {
      handleExpand();
    };
    window.addEventListener(ASSISTANT_OPEN_EVENT, handleAssistantOpen);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, handleAssistantOpen);
  }, [handleExpand]);

  const overlayTransitionClass = prefersReducedMotion ? "" : "transition-opacity duration-200 ease-out";
  const panelTransitionClass = prefersReducedMotion ? "" : "transition-all duration-200 ease-out";

  const panelStateClasses = isExpanded
    ? "opacity-100 pointer-events-auto"
    : "opacity-0 pointer-events-none";

  const panelLayoutStyle = {
    minHeight: "320px",
  };

  const quickActionChipClassName =
    "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-primary/70";
  const adjustmentChipClassName =
    "rounded-full border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-slate-900/40 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:border-slate-600";

  const renderCard = useCallback(
    (card: AssistantCard, index: number) => {
      const baseClass =
        "rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
      if (card.type === "metric") {
        return (
          <div key={`${card.type}-${index}`} className={baseClass}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{card.title}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
            {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
          </div>
        );
      }
      if (card.type === "list") {
        const listItems = Array.isArray(card.items) ? card.items : [];
        return (
          <div key={`${card.type}-${index}`} className={baseClass}>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{card.title}</p>
            {card.subtitle && <p className="text-xs text-slate-500">{card.subtitle}</p>}
            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {listItems.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>• {item}</li>
              ))}
            </ul>
          </div>
        );
      }
      return (
        <div key={`${card.type}-${index}`} className={baseClass}>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{card.title}</p>
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
    },
    [],
  );

  const handleInputFocus = useCallback(() => {
    if (typeof window === "undefined") return;
    if (focusScrollTimeoutRef.current) {
      window.clearTimeout(focusScrollTimeoutRef.current);
    }
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    savedStageRef.current = false;
    focusScrollTimeoutRef.current = window.setTimeout(() => {
      scrollToLatestMessage();
    }, 300);
  }, [scrollToLatestMessage]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      handleSendMessage(trimmed);
    },
    [handleSendMessage, inputValue],
  );

  return (
    <>
      <div
        aria-hidden={!isExpanded}
        className={`fixed inset-0 z-[90] ${isExpanded ? "" : "pointer-events-none"}`}
      >
        <div
          className={`${overlayTransitionClass} absolute inset-0 z-[88] bg-slate-900/40`}
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
          className={`fixed left-0 right-0 bottom-0 z-[94] flex h-full flex-col overflow-hidden rounded-t-[24px] bg-white ${panelTransitionClass} ${panelStateClasses} ${prefersReducedMotion ? "transition-none" : ""} md:inset-auto md:right-4 md:bottom-4 md:left-auto md:w-[380px] md:max-h-[70vh] md:h-auto md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl md:z-[52] dark:bg-slate-950 dark:border-slate-800`}
          style={panelLayoutStyle}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative flex items-center justify-between gap-3 rounded-t-3xl border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-2xl bg-primary text-white flex items-center justify-center text-lg">
                🙂
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assistente</p>
            </div>
            <button
              type="button"
              onClick={handleCollapse}
              aria-label="Fechar assistente"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-slate-50"
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
              {orderedMessages.length === 0 && !isTyping ? (
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-300">
                  Exemplos: mercado 50 • uber 23,90 crédito inter
                </p>
              ) : (
                orderedMessages.map((message) => {
                  const isUser = message.from === "user";
                  const shouldAnimateMessage =
                    !prefersReducedMotion && message.id === enteringMessageId;
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
                            : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                <div className="mt-2 max-w-[70%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Digitando...
                </div>
              )}
              <div ref={messagesEndRef} aria-hidden="true" className="h-px w-full" />
            </div>
            <div
              className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + var(--keyboard-offset, 0px))",
              }}
            >
              {shouldShowQuickActions && (
                <div className="mt-3 max-h-[170px] overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {paymentActions.length > 0 && (
                      <section className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                          Pagamento
                        </p>
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
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                          Cartões
                        </p>
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
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                          Categorias sugeridas
                        </p>
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
                    className="flex-1 min-h-[44px] max-h-[96px] resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    style={{ maxHeight: "min(96px, calc(var(--vh, 1vh) * 25))" }}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isSending}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  >
                    {isSending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed z-[96] right-4 bottom-4">
        <button
          ref={toggleButtonRef}
          type="button"
          aria-expanded={isExpanded}
          aria-controls="assistant-widget-panel"
          aria-label="Abrir assistente"
          onClick={handleExpand}
          className="group flex min-h-[56px] items-center gap-3 rounded-[32px] border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-lg shadow-slate-200 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus-visible:ring-offset-slate-950"
        >
          <span className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-2xl">
            🙂
          </span>
          <div className="flex flex-1 flex-col items-start">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assistente</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">Registrar despesas</p>
          </div>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 transition group-hover:border-primary dark:border-slate-700"
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 stroke-slate-600 dark:stroke-slate-100" strokeWidth="1.5">
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </>
  );
};

export default AssistantWidget;
