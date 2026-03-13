import axios from 'axios';
import { AIConfigService } from '../ai/ai.config.service';
export class LLMService {
    static async getConfig() {
        if (!this.config) {
            this.config = await AIConfigService.loadConfig();
        }
        return this.config;
    }
    static async ask(messages) {
        const config = await this.getConfig();
        if (config.provider === 'google-ai' && config.googleAI) {
            return this.askGoogleAI(messages, config.googleAI);
        }
        else {
            throw new Error('Configuração inválida - apenas Google AI é suportado');
        }
    }
    static async askWithConfig(messages, config) {
        if (config.provider === 'google-ai' && config.googleAI) {
            return this.askGoogleAI(messages, config.googleAI);
        }
        else {
            throw new Error('Configuração inválida para teste - apenas Google AI é suportado');
        }
    }
    static async askGoogleAI(messages, config) {
        if (!config) {
            throw new Error('Configuração do Google AI não encontrada');
        }
        try {
            // Google AI não suporta role 'system' diretamente, então tratamos o prompt como primeira mensagem
            const systemMessage = messages.find(msg => msg.role === 'system');
            const otherMessages = messages.filter(msg => msg.role !== 'system');
            // Se houver system prompt, coloca como primeira mensagem
            const googleAIMessages = [];
            if (systemMessage) {
                googleAIMessages.push({
                    parts: [{ text: systemMessage.content }]
                });
            }
            // Adiciona as outras mensagens
            otherMessages.forEach(msg => {
                googleAIMessages.push({
                    parts: [{ text: msg.content }]
                });
            });
            // Se não houver mensagens, cria uma mensagem inicial
            if (googleAIMessages.length === 0) {
                googleAIMessages.push({
                    parts: [{ text: 'Olá! Como posso ajudar?' }]
                });
            }
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
                contents: googleAIMessages,
                generationConfig: {
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens
                }
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
        }
        catch (error) {
            console.error('Google AI API error:', error);
            throw new Error('Erro ao comunicar com Google AI');
        }
    }
    static async reloadConfig() {
        this.config = await AIConfigService.loadConfig();
    }
}
LLMService.config = null;
