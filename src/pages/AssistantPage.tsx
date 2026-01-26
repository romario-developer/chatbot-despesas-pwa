import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { AssistantCard } from "../api/assistant";
import { useAssistantChat } from "../hooks/useAssistantChat";

const TABBAR_HEIGHT_VAR = "var(--tabbar-height, 64px)";

const AssistantPage = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth < 768;
  });
  const [keyboardInset, setKeyboardInset] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

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
  } = useAssistantChat();

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      navigate("/", { replace: true });
    }
  }, [isMobile, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const updateInset = () => {
      if (typeof window === "undefined") return;
      const viewportHeight = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const inset = Math.max(window.innerHeight - viewportHeight - offsetTop, 0);
      setKeyboardInset(inset);
      if (rootRef.current) {
        rootRef.current.style.setProperty("--kbd", `${inset}px`);
      }
    };
    updateInset();
    if (vv) {
      vv.addEventListener("resize", updateInset);
      vv.addEventListener("scroll", updateInset);
    }
    window.addEventListener("resize", updateInset);
    window.addEventListener("orientationchange", updateInset);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateInset);
        vv.removeEventListener("scroll", updateInset);
      }
      window.removeEventListener("resize", updateInset);
      window.removeEventListener("orientationchange", updateInset);
      if (rootRef.current) {
        rootRef.current.style.removeProperty("--kbd");
      }
    };
  }, []);

  useEffect(() => {
    if (!messages.length) {
      setToastMessage(null);
    }
  }, [messages.length, setToastMessage]);

  const adjustInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      const maxHeight = 96;
      const nextHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${nextHeight}px`;
    };
    resize();
  }, []);

  useEffect(() => {
    adjustInputHeight();
  }, [inputValue, adjustInputHeight]);

  const handleInputFocus = useCallback(() => {
    if (typeof window === "undefined") return;
    setTimeout(() => {
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

  const bubbleStyle: CSSProperties = {
    maxWidth: "85%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("assistant-no-x");
    return () => {
      document.body.classList.remove("assistant-no-x");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 flex w-full flex-col overflow-x-hidden bg-slate-950 text-slate-50"
      style={{
        height: "100dvh",
        minHeight: "calc(var(--vh, 1vh) * 100)",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-slate-50 transition hover:text-white"
        >
          Voltar
        </button>
        <h1 className="text-sm font-semibold">Assistente</h1>
        <div className="w-12" />
      </header>
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex h-full flex-col overflow-y-auto px-4 py-3 pb-4"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: `calc(${TABBAR_HEIGHT_VAR} + env(safe-area-inset-bottom, 16px) + 32px)`,
          }}
        >
          {toastMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm text-left text-slate-950">
              {toastMessage}
            </div>
          )}
          {assistantCards.length > 0 && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">{assistantCards.map(renderCard)}</div>
          )}
          {shouldShowQuickActions && (
            <div className="mt-3 space-y-3 pr-1">
              {adjustmentActions.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
              {paymentActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Pagamento</p>
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
                </div>
              )}
              {cardActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Cartões</p>
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
                </div>
              )}
              {categoryActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
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
                </div>
              )}
            </div>
          )}
          <div className="flex-1">
            {(messages.length === 0 && !isTyping) ? (
              <p className="mt-6 text-xs leading-relaxed text-slate-400">
                Exemplos: mercado 50 • uber 23,90 crédito inter
              </p>
            ) : (
              messages.map((message) => {
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
                          : "border-slate-700 bg-slate-900 text-slate-100"
                        }`}
                      style={bubbleStyle}
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
            {assistantCards.length === 0 && isTyping && (
              <div className="mt-2 max-w-[70%] rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                Digitando...
              </div>
            )}
            <div ref={messagesEndRef} className="h-px w-full" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div
        className="border-t border-slate-800 bg-slate-950 px-4 py-3"
        style={{
          paddingBottom: `calc(${TABBAR_HEIGHT_VAR} + env(safe-area-inset-bottom, 16px) + ${keyboardInset}px)`,
        }}
      >
        <form ref={formRef} onSubmit={handleSubmit} className="flex items-center gap-3">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onFocus={handleInputFocus}
            placeholder="Digite uma despesa… (ex: mercado 50)"
            className="flex-1 min-h-[44px] max-h-[96px] resize-none rounded-3xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
            style={{ maxHeight: "min(96px, calc(var(--vh, 1vh) * 25))" }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            {isSending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssistantPage;
