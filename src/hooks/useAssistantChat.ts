import { useCallback, useEffect, useState } from "react";
import { postAssistantMessage, } from "../api/assistant";
import { aiService } from "../services/aiService";
import { getCurrentMonthInTimeZone } from "../utils/months";
import { emitDataChanged } from "../utils/dataBus";

// Palavras que ativam a Nova Inteligência Artificial
const AI_KEYWORDS = /(quanto|qual|quais|resumo|gasto|gastos|mês|mes|saldo|fatura|faturas|planejamento|meta|comparar|top|maiores)/i;

const STORAGE_KEY = "assistantConversationId";

export const useAssistantChat = ({ onSavedStage }: { onSavedStage?: () => void } = {}) => {
  const [month] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("selectedMonth") ?? getCurrentMonthInTimeZone("America/Bahia") : "2026-03");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Controle de Roteamento
  const [conversationId, setConversationId] = useState<string | null>(() => typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null);
  const [aiConversationId, setAiConversationId] = useState<string | undefined>(undefined);
  const [isPendingExpenseStep, setIsPendingExpenseStep] = useState(false);

  useEffect(() => {
    if (conversationId) window.localStorage.setItem(STORAGE_KEY, conversationId);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [conversationId]);

  const handleSendMessage = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text: trimmed }]);
    setInputValue("");
    setIsTyping(true);
    setIsSending(true);

    // O Roteador Inteligente
    const isQuestion = AI_KEYWORDS.test(trimmed);
    
    // A ROTA DE FUGA: Se você fizer uma pergunta no meio de um lançamento,
    // a gente cancela o lançamento antigo, apaga a memória dele e chama a Nova IA.
    if (isQuestion && isPendingExpenseStep) {
      setIsPendingExpenseStep(false);
      setConversationId(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const useAiRoute = isQuestion;

    try {
      if (useAiRoute) {
        // ROTA DA NOVA IA (Consultor)
        const response = await aiService.sendMessage(trimmed, aiConversationId);
        if (response.conversationId) setAiConversationId(response.conversationId);

        setMessages((prev) => [...prev, { 
          id: `ai-${Date.now()}`, 
          role: "assistant", 
          text: response.assistantMessage, 
          cards: response.cards,
          suggestedActions: response.suggestedActions
        }]);
      } else {
        // ROTA ANTIGA (Lançamento Rápido Passo a Passo)
        const response = await postAssistantMessage({ message: trimmed, month, conversationId: conversationId ?? undefined });
        if (response.conversationId) setConversationId(response.conversationId);
        
        const stage = response.state?.stage ?? null;
        const uiHint = response.uiHint ?? null;
        const isSavedStage = stage === "saved" || uiHint?.kind === "saved";
        
        // Se a IA antiga perguntou algo, travamos na rota de despesa
        setIsPendingExpenseStep(!!stage && stage !== "saved" && uiHint?.kind !== "saved");

        if (isSavedStage) {
          emitDataChanged({ scope: "all", month: uiHint?.planning?.month ?? month });
          onSavedStage?.();
        } 
        
        setMessages((prev) => [...prev, { 
          id: `old-${Date.now()}`, 
          role: "assistant", 
          text: response.assistantMessage, 
          cards: response.cards,
          suggestedActions: response.suggestedActions
        }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", text: "Tive um problema de conexão. Tente novamente." }]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  }, [conversationId, aiConversationId, isPendingExpenseStep, isSending, month, onSavedStage]);

  return { handleSendMessage, inputValue, setInputValue, isSending, isTyping, messages };
};