import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

const GREETING_KEY = "assistant_greeting_last_date";
const DEBUG_KEY = "DEBUG_ASSISTANT";

const formatToday = () => new Date().toISOString().slice(0, 10);

const isDebugEnabled = () =>
  typeof window !== "undefined" && window.localStorage.getItem(DEBUG_KEY) === "1";

const logAssistant = (...args: unknown[]) => {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[assistant-debug]", ...args);
};

const createMessage = (role: AssistantMessage["role"], text: string): AssistantMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
});

const AssistantFAB = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!chatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatOpen, messages]);

  useEffect(() => {
    if (chatOpen) {
      setGreetingVisible(false);
    }
  }, [chatOpen]);

  const handleOpen = useCallback(() => {
    setChatOpen(true);
    setGreetingVisible(false);
    logAssistant("assistant open");
  }, []);

  const handleClose = useCallback(() => {
    setChatOpen(false);
    logAssistant("assistant close");
  }, []);

  const handleHideGreeting = useCallback(() => {
    setGreetingVisible(false);
    logAssistant("greeting dismissed");
  }, []);

  const handleSend = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      const userMessage = createMessage("user", trimmed);
      const assistantMessage = createMessage(
        "assistant",
        "Entendi. Em breve terei IA para ajudar melhor.",
      );
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInputValue("");
      logAssistant("message sent", userMessage, assistantMessage);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    [inputValue],
  );

  const assistButtonLabel = useMemo(() => "Assistente", []);

  return (
    <>
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end px-4 pb-24 pt-8 sm:pb-6">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-[360px]">
            <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
                  🙂
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Assistente</p>
                  <p className="text-sm font-semibold text-slate-900">Como posso ajudar?</p>
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
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm" aria-live="polite">
                {messages.length === 0 ? (
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Como posso ajudar?
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                          message.role === "user"
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="space-y-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Escreva algo como: 'paguei 50 no mercado'"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={!inputValue.trim()}
                >
                  Enviar
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
            <p>Olá! Posso te ajudar a registrar uma despesa?</p>
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
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span role="img" aria-hidden="true">
            🙂
          </span>
          <span className="sr-only">{assistButtonLabel}</span>
        </button>
      </div>
    </>
  );
};

export default AssistantFAB;
