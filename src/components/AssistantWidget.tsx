import { useEffect, useRef, useState } from "react";
import { useAssistantChat } from "../hooks/useAssistantChat";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function AssistantWidget() {
  const [widgetState, setWidgetState] = useState<"collapsed" | "expanded">("collapsed");
  const isExpanded = widgetState === "expanded";
  
  const { messages, inputValue, setInputValue, handleSendMessage, clearChat, isSending, isTyping } = useAssistantChat();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Referências para os áudios
  const audioSend = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3")); 
  const audioReceive = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3")); 
  const audioSuccess = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3")); 

   // --- NOVA LÓGICA: SAUDAÇÃO INICIAL AUTOMÁTICA VIA BACKEND ---
  useEffect(() => {
    // Quando o chat é aberto e não tem mensagens
    if (isExpanded && messages.length === 0 && !isTyping) {
      // Envia o gatilho pro backend (sem o "true", para a requisição realmente acontecer)
      handleSendMessage("[SYSTEM_INIT]");
    }
  }, [isExpanded, messages.length, isTyping, handleSendMessage]); 
  // --------------------------------------------------

  useEffect(() => {
    const handleGlobalOpen = () => setWidgetState("expanded");
    window.addEventListener('OPEN_GLOBAL_ASSISTANT', handleGlobalOpen);
    return () => window.removeEventListener('OPEN_GLOBAL_ASSISTANT', handleGlobalOpen);
  }, []);

  useEffect(() => {
    audioSend.current.volume = 0.4;
    audioReceive.current.volume = 0.5;
    audioSuccess.current.volume = 0.3;
  }, []);

  useEffect(() => {
    if (isExpanded && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isExpanded]);

  const handleCloseWidget = () => {
    setWidgetState("collapsed");
  };

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isSending]);

  // Gatilho sonoro Inteligente
  useEffect(() => {
    if (messages.length === 0) return;
    const isSoundOn = localStorage.getItem('ai-sound') !== 'false';
    if (!isSoundOn) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") audioSend.current.play().catch(() => {});
    else audioReceive.current.play().catch(() => {});
  }, [messages.length]);

  // Gatilho sonoro para o Sucesso de Lançamento
  useEffect(() => {
    const isSoundOn = localStorage.getItem('ai-sound') !== 'false';
    if (!isSoundOn) return;

    if (isSending === false && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.text?.includes("✅")) audioSuccess.current.play().catch(() => {});
    }
  }, [isSending]);

  const renderCard = (card: any, index: number) => {
    const baseClass = "mt-3 w-[95%] animate-msg rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-sm";
    
    if (card.type === "chart" && card.data) {
      const CHART_COLORS = [
        `hsl(var(--primary-h, 220), 70%, 50%)`,
        `hsl(var(--analogous-h, 190), 70%, 50%)`,
        `hsl(var(--complementary-h, 40), 70%, 50%)`,
        `hsl(var(--primary-h, 220), 50%, 40%)`,
      ];

      return (
        <div key={index} className={baseClass}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-4">{card.title}</p>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={card.data} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                  {card.data.map((_: any, i: number) => (
                    <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (card.type === "summary" && card.data?.invoices) {
      return (
        <div key={index} className="mt-4 w-full space-y-4 animate-msg">
          {card.data.invoices.map((inv: any, i: number) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 ai-glow">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary">💳</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{inv.cardName}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Vence {inv.dueDate.split("-").reverse().join("/")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{inv.formattedRemaining}</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 px-5 py-2 dark:divide-slate-800/50">
                {inv.purchases?.slice(0, 5).map((p: any, j: number) => (
                  <div key={j} className="flex justify-between py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.description}</span>
                        {p.installmentTotal > 1 && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-primary">{p.installmentCurrent}/{p.installmentTotal}</span>}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{p.date.split("-").reverse().slice(0, 2).join("/")}</span>
                    </div>
                    <span className="text-sm font-black text-slate-600 dark:text-slate-400">R$ {p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (card.type === "metric") {
      const isNegative = card.data?.value < 0;
      return (
        <div key={index} className={baseClass}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">{card.title}</p>
          <p className={`text-2xl font-black ${isNegative ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.data ? card.data.value / 100 : card.value / 100)}
          </p>
          {card.data?.detail && <p className="mt-2 text-[11px] font-medium text-slate-500 leading-relaxed">{card.data.detail}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <style>{`
        .bg-primary { background-color: hsl(var(--primary-h, 220), 70%, 50%) !important; }
        .text-primary { color: hsl(var(--primary-h, 220), 70%, 50%) !important; }
        .border-primary { border-color: hsl(var(--primary-h, 220), 70%, 50%) !important; }
        .bg-primary\\/10 { background-color: hsla(var(--primary-h, 220), 70%, 50%, 0.1) !important; }
        .bg-primary\\/5 { background-color: hsla(var(--primary-h, 220), 70%, 50%, 0.05) !important; }
        .border-primary\\/20 { border-color: hsla(var(--primary-h, 220), 70%, 50%, 0.2) !important; }

        @keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-msg { animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .dot-pulse { animation: pulse 1.5s infinite ease-in-out; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
      `}</style>

      <div className={`fixed inset-0 z-[100] transition-all duration-300 ${isExpanded ? "visible" : "invisible"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0"}`} onClick={handleCloseWidget} />
        
        <div className={`fixed inset-x-0 bottom-0 z-[101] flex h-[92dvh] flex-col overflow-hidden rounded-t-[40px] bg-white shadow-2xl transition-all duration-500 ease-out dark:bg-slate-950 md:inset-auto md:right-6 md:bottom-6 md:h-[700px] md:w-[420px] md:rounded-[32px] md:border md:border-white/10 ${isExpanded ? "translate-y-0" : "translate-y-full"}`}>
          
          {/* CABEÇALHO DO CHAT */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur-md dark:border-white/5 dark:bg-slate-950/80">
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl shadow-lg shadow-primary/30 transition-all duration-500">🤖</span>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-slate-950" />
              </div>
              <div>
                <p className="text-base font-black text-slate-900 dark:text-white">Super Assistente</p>
                <div className="flex items-center gap-2">
                   <p className="text-[11px] font-bold text-green-500 uppercase tracking-widest">Online Agora</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={clearChat} className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 transition-all active:scale-95">Limpar</button>
                <button onClick={handleCloseWidget} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl text-slate-500 hover:bg-slate-200 dark:bg-white/5 transition-all active:scale-95">×</button>
            </div>
          </div>

          {/* LISTA DE MENSAGENS */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-6 dark:bg-slate-950/50" ref={scrollRef}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";

              return (
                <div key={idx} className={`mb-6 flex flex-col ${isUser ? "items-end" : "items-start"} animate-msg`}>
                  <div className={`max-w-[85%] rounded-[24px] px-5 py-4 text-sm font-medium shadow-sm leading-relaxed transition-all duration-500 ${isUser ? "bg-primary text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none dark:bg-slate-900 dark:border-white/5 dark:text-slate-100"}`}>
                    {msg.text}
                  </div>
                  {!isUser && msg.cards?.map((c: any, i: number) => renderCard(c, i))}
                  {!isUser && msg.suggestedActions && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.suggestedActions.map((a: any, i: number) => (
                        <button key={i} onClick={() => handleSendMessage(a.label)} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-[11px] font-bold text-primary transition-all hover:bg-primary hover:text-white">{a.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {isTyping ? (
              <div className="flex items-center gap-3 px-4 py-2 animate-pulse">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary/40 dot-pulse" style={{ animationDelay: '0s' }} />
                  <div className="h-2 w-2 rounded-full bg-primary/40 dot-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="h-2 w-2 rounded-full bg-primary/40 dot-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processando...</span>
              </div>
            ) : isSending ? (
              <div className="flex items-center gap-2 px-4 py-2 animate-msg">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white shadow-sm shadow-green-500/30">✓</span>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Aguardando IA...</span>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT DO CHAT */}
          <div className="bg-white p-6 dark:bg-slate-950">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex items-center gap-3">
              <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Como posso te ajudar?" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base md:text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white" />
              <button type="submit" disabled={!inputValue.trim() || isSending} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg transition-all active:scale-95 disabled:opacity-50">🚀</button>
            </form>
          </div>
        </div>
      </div>

      {!isExpanded && (
        <button onClick={() => setWidgetState("expanded")} className="hidden md:flex fixed bottom-8 right-8 z-[90] h-16 w-16 items-center justify-center rounded-[24px] bg-[#ec407a] text-3xl shadow-2xl shadow-[#ec407a]/40 transition-all hover:scale-110 active:scale-90 hover:rotate-6" style={{ animation: 'bounce 2s infinite' }}>
          🚀
        </button>
      )}
    </>
  );
}