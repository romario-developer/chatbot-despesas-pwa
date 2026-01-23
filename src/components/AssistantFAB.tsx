import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createQuickEntry } from "../services/quickEntryService";

const GREETING_KEY = "assistant_last_greeting_date";
const DEBUG_KEY = "DEBUG_ASSISTANT";
const AUTO_CLOSE_DELAY = 800;

const formatToday = () => new Date().toISOString().slice(0, 10);

const isDebugEnabled = () =>
  typeof window !== "undefined" && window.localStorage.getItem(DEBUG_KEY) === "1";

const logAssistant = (...args: unknown[]) => {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[assistant-debug]", ...args);
};

type AssistantFABProps = {
  avatarUrl?: string;
  iconVariant?: "circle" | "rounded";
};

const isAIEnabled = false; // Set to true when the IA layer is ready in the future.

const AssistantFAB = ({ avatarUrl, iconVariant = "circle" }: AssistantFABProps = {}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoCloseTimeoutRef = useRef<number | null>(null);

  const greetingText = "Olá! Precisa registrar alguma despesa?";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = formatToday();
    const lastDate = window.localStorage.getItem(GREETING_KEY);
    if (lastDate !== today) {
      setGreetingVisible(true);
      window.localStorage.setItem(GREETING_KEY, today);
      logAssistant("greeting shown", today);
    }
  }, []);

  useEffect(() => {
    if (chatOpen) {
      setGreetingVisible(false);
    }
  }, [chatOpen]);

  const resetAssistantState = useCallback(() => {
    setInputValue("");
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSending(false);
    if (autoCloseTimeoutRef.current) {
      window.clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    resetAssistantState();
    setChatOpen(true);
    setGreetingVisible(false);
    logAssistant("assistant open");
  }, [resetAssistantState]);

  const handleClose = useCallback(() => {
    setChatOpen(false);
    resetAssistantState();
    logAssistant("assistant close");
  }, [resetAssistantState]);

  const handleHideGreeting = useCallback(() => {
    setGreetingVisible(false);
    logAssistant("greeting dismissed");
  }, []);

  const handleSend = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      setIsSending(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        if (isAIEnabled) {
          const assistantReply = "Entendi. Em breve terei IA para ajudar melhor.";
          setSuccessMessage(assistantReply);
          logAssistant("message sent", trimmed, assistantReply);
        } else {
          await createQuickEntry(trimmed);
          const successReply = "Pronto! Registrei sua despesa.";
          setSuccessMessage(successReply);
          setInputValue("");
          autoCloseTimeoutRef.current = window.setTimeout(() => {
            handleClose();
          }, AUTO_CLOSE_DELAY);
          logAssistant("expense logged", trimmed, successReply);
        }
      } catch (error) {
        const assistantError = "Não consegui registrar, pode tentar de novo?";
        setErrorMessage(assistantError);
        logAssistant("expense error", trimmed, assistantError, error);
      } finally {
        setIsSending(false);
      }
    },
    [handleClose, inputValue],
  );

  const assistButtonLabel = useMemo(() => "Assistente", []);
  const avatarClasses = useMemo(
    () => (iconVariant === "circle" ? "rounded-full" : "rounded-2xl"),
    [iconVariant],
  );
  const renderAvatar = useCallback(
    (size: string, textSize?: string) => {
      const baseClasses = `${size} ${avatarClasses} flex items-center justify-center overflow-hidden`;
      if (avatarUrl) {
        return (
          <img
            src={avatarUrl}
            alt="Avatar do assistente"
            className={`${baseClasses} object-cover`}
          />
        );
      }
      return (
        <span className={`${baseClasses} bg-primary text-white ${textSize ?? "text-2xl"}`}>
          🙂
        </span>
      );
    },
    [avatarClasses, avatarUrl],
  );

  return (
    <>
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end px-4 pb-24 pt-8 sm:pb-6">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-[360px]">
            <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                {renderAvatar("h-10 w-10")}
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Assistente</p>
                  <p className="text-sm font-semibold text-slate-900">Como posso ajudar?</p>
                  <span className="text-[11px] text-emerald-600">online</span>
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
            <div className="flex h-[320px] flex-col gap-3 px-4 py-3">
              <div className="flex-1 pr-1 text-sm" aria-live="polite">
                {errorMessage ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-rose-700">
                    {errorMessage}
                  </p>
                ) : successMessage ? (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    {successMessage}
                  </p>
                ) : (
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Como posso ajudar?
                  </p>
                )}
              </div>
              <form onSubmit={handleSend} className="space-y-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Digite algo como: mercado 50"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={isSending || !inputValue.trim()}
                >
                  {isSending ? "Enviando..." : "Enviar"}
                </button>
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
        {greetingVisible && !chatOpen && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-lg shadow-slate-200 transition">
            <p>{greetingText}</p>
            <button
              type="button"
              onClick={handleHideGreeting}
              aria-label="Fechar saudação"
              className="rounded-full p-1 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              ×
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={handleOpen}
          aria-label={assistButtonLabel}
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {renderAvatar("h-10 w-10", "text-xl")}
          <span className="sr-only">{assistButtonLabel}</span>
        </button>
      </div>
    </>
  );
};

export default AssistantFAB;
