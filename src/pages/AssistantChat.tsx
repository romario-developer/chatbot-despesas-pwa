// src/pages/AssistantChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../services/aiService';

// Expandimos a interface local para guardar os cards e ações
interface UIMessage {
  role: 'user' | 'assistant';
  text: string;
  cards?: any[];
  suggestedActions?: any[];
}

export function AssistantChat() {
  const [messages, setMessages] = useState<UIMessage[]>([
    { role: 'assistant', text: 'Olá! Sou seu assistente financeiro. Como posso te ajudar hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendToAI = async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(text, conversationId);
      
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: response.assistantMessage,
          cards: response.cards,
          suggestedActions: response.suggestedActions
        }
      ]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, tive um problema de conexão. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const userText = inputValue.trim();
    setInputValue('');
    sendToAI(userText);
  };

  // Motor de Renderização de Cards Ricos
  const renderCards = (cards?: any[]) => {
    if (!cards || cards.length === 0) return null;

    return (
      <div className="flex flex-col gap-3 mt-3 w-full">
        {cards.map((card, idx) => {
          
          // 1. Card de Métrica (Saldo, Planejamento)
          if (card.type === 'metric') {
            const valorFormatado = new Intl.NumberFormat('pt-BR', { 
              style: 'currency', currency: card.data.currency || 'BRL' 
            }).format(card.data.value / 100);

            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full md:w-80">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">{card.title}</p>
                <p className={`text-2xl font-black ${card.data.value < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {valorFormatado}
                </p>
                {card.data.detail && <p className="text-xs text-gray-500 mt-2 font-medium">{card.data.detail}</p>}
              </div>
            );
          }

          // 2. Card de Lista (Maiores gastos, Top categorias)
          if (card.type === 'list') {
            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full md:w-80">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">{card.title}</p>
                <div className="space-y-3">
                  {card.data.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{item.title}</span>
                        {item.subtitle && <span className="text-xs text-gray-500">{item.subtitle}</span>}
                      </div>
                      <span className="text-sm font-black text-gray-800">{item.formattedValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // 3. Card de Resumo de Faturas
          if (card.type === 'summary' && card.data.invoices) {
            return (
              <div key={idx} className="bg-white border border-red-100 rounded-xl p-4 shadow-sm w-full md:w-80">
                <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-3">{card.title}</p>
                <div className="space-y-3">
                  {card.data.invoices.map((inv: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-800">{inv.cardName}</span>
                      <span className="text-sm font-black text-red-600">{inv.formattedRemaining}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800">Total Aberto</span>
                    <span className="text-lg font-black text-red-600">{card.data.formattedTotalRemaining}</span>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  // Motor de Renderização de Ações Sugeridas (Botões rápidos)
  const renderSuggestedActions = (actions?: any[]) => {
    if (!actions || actions.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => sendToAI(action.label)}
            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-1.5 px-3 rounded-full transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white p-4 shadow-md z-10">
        <h1 className="text-xl font-bold">Assistente de Despesas</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            
            {/* O Balão de Texto (com as cores já corrigidas) */}
            <div 
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-gray-200 text-gray-900 border border-gray-300 rounded-tl-none font-medium'
              }`}
            >
              <p className="text-sm md:text-base whitespace-pre-wrap">{msg.text}</p>
            </div>

            {/* Injeta os Cards Ricos abaixo do texto da IA */}
            {msg.role === 'assistant' && renderCards(msg.cards)}
            
            {/* Injeta os Botões de Ação Sugerida */}
            {msg.role === 'assistant' && renderSuggestedActions(msg.suggestedActions)}

          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 border border-gray-300 rounded-2xl rounded-tl-none p-4 shadow-sm flex space-x-2 items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Pergunte sobre seus gastos, faturas..."
            className="flex-1 border border-gray-300 bg-gray-50 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-gray-800"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-full px-6 py-3 font-bold transition-colors shadow-sm flex items-center justify-center"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}