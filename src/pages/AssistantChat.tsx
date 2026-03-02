// src/pages/AssistantChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../services/aiService';
import type { ChatMessage } from '../services/aiService';

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Olá! Sou seu assistente financeiro. Como posso te ajudar hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rola para baixo automaticamente quando chega nova mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(userText, conversationId);
      
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      setMessages(prev => [...prev, { role: 'assistant', text: response.assistantMessage }]);
      
      // TODO futuro: Renderizar response.cards e response.suggestedActions aqui
      
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, tive um problema de conexão. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md z-10">
        <h1 className="text-xl font-bold">Assistente de Despesas</h1>
      </header>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
  className={`max-w-[80%] rounded-2xl p-4 shadow-md ${
    msg.role === 'user' 
      ? 'bg-indigo-600 text-white rounded-tr-none' 
      : 'bg-gray-200 text-gray-900 border border-gray-300 rounded-tl-none font-medium'
  }`}
>
  <p className="text-sm md:text-base whitespace-pre-wrap">{msg.text}</p>
</div>
          </div>
        ))}
        
        {/* Indicador de Digitação */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex space-x-2 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <div className="p-3 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite uma despesa ou faça uma pergunta..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-full px-6 py-3 font-medium transition-colors shadow-sm flex items-center justify-center"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}