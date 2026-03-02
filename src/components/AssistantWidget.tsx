import { useEffect, useRef, useState } from "react";
import AssistantIcon from "./AssistantIcon";
import { ASSISTANT_OPEN_EVENT } from "../constants/assistantEvents";
import { useAssistantChat } from "../hooks/useAssistantChat";

const WIDGET_STATE_KEY = "assistantWidgetState";

export default function AssistantWidget() {
  const [widgetState, setWidgetState] = useState<"collapsed" | "expanded">(() => {
    if (typeof window === "undefined") return "collapsed";
    return window.localStorage.getItem(WIDGET_STATE_KEY) === "expanded" ? "expanded" : "collapsed";
  });
  
  const isExpanded = widgetState === "expanded";
  
  // Chama o Cérebro Unificado e a função de Limpar
  const { messages, inputValue, setInputValue, handleSendMessage, clearChat, isSending, isTyping } = useAssistantChat();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
    localStorage.setItem(WIDGET_STATE_KEY, widgetState);
  }, [isExpanded, widgetState]);

  // Função centralizada para fechar e limpar o chat
  const handleCloseWidget = () => {
    setWidgetState("collapsed");
    clearChat(); // Limpa o histórico automaticamente ao fechar
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (e.key === "Escape") handleCloseWidget(); 
    };
    const handleOpen = () => setWidgetState("expanded");
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(ASSISTANT_OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(ASSISTANT_OPEN_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const renderCard = (card: any, index: number) => {
    const baseClass = "mt-2 w-[90%] rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
    
    if (card.type === "summary" && card.data?.invoices) {
      return (
        <div key={index} className={baseClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-bold mb-3">{card.title}</p>
          <div className="space-y-3">
            {card.data.invoices.map((inv: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="font-semibold">{inv.cardName}</span>
                <span className="font-black text-red-500">{inv.formattedRemaining}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (card.type === "metric") {
      const value = card.data ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.data.value / 100) : card.value;
      const subtitle = card.data ? card.data.detail : card.subtitle;
      return (
        <div key={index} className={baseClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold">{card.title}</p>
          <p className={`mt-1 text-2xl font-bold ${card.data?.value < 0 ? 'text-red-500' : ''}`}>{value}</p>
          {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
        </div>
      );
    }

    if (card.type === "list") {
      if (card.data) {
        return (
          <div key={index} className={baseClass}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mb-2">{card.title}</p>
            <div className="space-y-2">
              {card.data.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.title}</span>
                    {item.subtitle && <span className="text-[11px] text-slate-500">{item.subtitle}</span>}
                  </div>
                  <span className="font-bold">{item.formattedValue}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div key={index} className={baseClass}>
          <p className="text-xs font-semibold">{card.title}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {(card.items || []).map((item: string, i: number) => <li key={i}>• {item}</li>)}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div aria-hidden={!isExpanded} className={`fixed inset-0 z-[100] ${isExpanded ? "" : "pointer-events-none"}`}>
        {/* Fundo escuro: Clica aqui = Fecha e limpa */}
        <div 
          className={`absolute inset-0 z-[90] bg-slate-900/40 transition-opacity duration-200`} 
          style={{ opacity: isExpanded ? 1 : 0 }} 
          onClick={handleCloseWidget} 
        />
        
        {/* Modal do Chat: Garantido que está na frente (z-100) */}
        <div
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          className={`fixed left-0 right-0 bottom-0 z-[100] flex h-full flex-col overflow-hidden rounded-t-[24px] bg-white transition-all duration-200 ${isExpanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} md:inset-auto md:right-4 md:bottom-4 md:left-auto md:w-[400px] md:max-h-[75vh] md:h-auto md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl dark:bg-slate-950 dark:border-slate-800`}
          style={{ minHeight: "350px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white text-lg">🙂</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Super Assistente</p>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Botão de Limpar Manual */}
              <button 
                onClick={clearChat} 
                title="Limpar conversa"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                Limpar
              </button>
              
              {/* Botão de Fechar */}
              <button 
                onClick={handleCloseWidget} 
                className="rounded-xl px-3 py-1 text-lg font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ×
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm bg-slate-50 dark:bg-slate-950">
            {messages.length === 0 && !isTyping && (
              <p className="text-xs text-center text-slate-500 mt-4">Digite "mercado 50" para lançar,<br/>ou pergunte "Como estão meus gastos?"</p>
            )}

            {messages.map((msg, idx) => {
              const isUser = msg.role === "user" || msg.from === "user";
              return (
                <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? "bg-primary text-white rounded-tr-none" : "bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                  
                  {!isUser && msg.cards && msg.cards.map((c: any, i: number) => renderCard(c, i))}
                  
                  {!isUser && msg.suggestedActions && (
                    <div className="flex flex-wrap gap-2 mt-2 w-[90%]">
                      {msg.suggestedActions.map((action: any, i: number) => (
                        <button key={i} onClick={() => handleSendMessage(action.prompt || action.label)} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20">
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="max-w-[50%] rounded-2xl rounded-tl-none border border-slate-700 bg-slate-800 px-4 py-3 text-slate-400">Analisando...</div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputValue); } }}
                placeholder="Ex: mercado 50 ou Resumo..."
                className="flex-1 min-h-[44px] max-h-[96px] resize-none rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button type="submit" disabled={!inputValue.trim() || isSending} className="flex h-[44px] items-center justify-center rounded-2xl bg-primary px-5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/90 disabled:opacity-50">Enviar</button>
            </form>
          </div>
        </div>
      </div>

      {!isExpanded && (
        <div className="fixed bottom-6 right-6 z-50">
          <button onClick={() => setWidgetState("expanded")} className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#25D366] text-white shadow-lg transition hover:-translate-y-1">
            <AssistantIcon className="h-8 w-8 text-white" />
          </button>
        </div>
      )}
    </>
  );
}