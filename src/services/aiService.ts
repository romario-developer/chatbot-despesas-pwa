// src/services/aiService.ts
import { api } from '../api/client'; 

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatResponse {
  conversationId: string;
  assistantMessage: string;
  cards: any[];
  suggestedActions: any[];
  refreshData?: boolean;
}

export const aiService = {
  async sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
    const response = await api.request({
      url: '/api/ai/chat', // Ajuste para a rota exata do seu backend
      method: 'POST',
      data: {
        message,
        conversationId,
      }
    });
    return response.data;
  },
};
