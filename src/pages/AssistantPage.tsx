import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import MonthPicker, {
  MonthPickerFieldTrigger,
  monthPickerFieldButtonClassName,
} from "../components/MonthPicker";
import Toast from "../components/Toast";
import { postAssistantMessage, type AssistantAction, type AssistantCard } from "../api/assistant";
import { formatMonthLabel, getCurrentMonthInTimeZone, getDefaultMonthRange } from "../utils/months";

const STORAGE_KEY = "assistantConversationId";

type AssistantMessage = {
  id: string;
  from: "user" | "assistant";
  text: string;
  cards?: AssistantCard[];
};

const AssistantPage = () => {
  const currentMonthValue = useMemo(() => getCurrentMonthInTimeZone("America/Bahia"), []);
  const monthRange = useMemo(
    () => getDefaultMonthRange({ endMonth: currentMonthValue, monthsBack: 24 }),
    [currentMonthValue],
  );
  const [month, setMonth] = useState(currentMonthValue);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<AssistantAction[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setConversationId(stored);
    }
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSendMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (isSending) return;
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
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(STORAGE_KEY, response.conversationId);
        }
      }
      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        from: "assistant",
        text: response.assistantMessage,
        cards: response.cards,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSuggestedActions(response.suggestedActions ?? []);
    } catch (err) {
      console.error("[assistant-error]", err);
      setToast({ message: "Não consegui responder agora.", type: "error" });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Assistente
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Conversa inteligente</h1>
          <p className="text-sm text-slate-600">
            Tire insights e veja cards com base na sua conversa.
          </p>
        </div>
        <div className="sm:w-72">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Mês
            <MonthPicker
              valueMonth={month}
              onChangeMonth={(value) => setMonth(value)}
              minMonth={monthRange.start}
              maxMonth={monthRange.end}
              buttonClassName={monthPickerFieldButtonClassName}
              trigger={<MonthPickerFieldTrigger label={monthLabel} />}
            />
          </label>
        </div>
      </div>

      <div className="flex h-[70vh] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col gap-3 ${message.from === "user" ? "items-end" : ""}`}
            >
              <div
                className={`max-w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
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
                <div className="grid gap-3 md:grid-cols-2">{message.cards.map(renderCard)}</div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex flex-col gap-2">
              <div className="max-w-[70%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Digitando...
              </div>
            </div>
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 px-4 py-3 sm:px-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              placeholder="Digite uma pergunta ou peça um insight..."
              className="min-h-[87px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>

      {suggestedActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestedActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleSuggestedAction(action)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default AssistantPage;
