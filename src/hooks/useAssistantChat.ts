import { useCallback, useEffect, useState } from "react";
import { aiService } from "../services/aiService";

const STORAGE_KEY = "assistantConversationId";

export const useAssistantChat = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const [conversationId, setConversationId] = useState<string | null>(() => 
    typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
  );

  useEffect(() => {
    if (conversationId) window.localStorage.setItem(STORAGE_KEY, conversationId);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [conversationId]);

  const handleSendMessage = useCallback(async (value: string, isSystemMessage: boolean = false) => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    
    if (isSystemMessage) {
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "assistant", text: trimmed }]);
      return;
    }

    const isHiddenInit = trimmed === "[SYSTEM_INIT]";
    if (!isHiddenInit) {
      setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text: trimmed }]);
    }

    setInputValue("");
    setIsTyping(true);
    setIsSending(true);

    try {
      const response = await aiService.sendMessage(trimmed, conversationId || undefined);
      if (response.conversationId) setConversationId(response.conversationId);

      // NOVO: Se a IA alterou dados, avisa o frontend para recarregar as telas!
      if (response.refreshData && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("planning-updated"));
        window.dispatchEvent(new CustomEvent("data-changed", { detail: {} }));
      }

      setMessages((prev) => [...prev, { 
        id: `ai-${Date.now()}`, 
        role: "assistant", 
        text: response.assistantMessage, 
        cards: response.cards || [],
        suggestedActions: response.suggestedActions || []
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", text: "Tive um problema de conexão com a IA." }]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  }, [conversationId, isSending]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { handleSendMessage, clearChat, inputValue, setInputValue, isSending, isTyping, messages };
};