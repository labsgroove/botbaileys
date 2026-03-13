import { AIConfigService } from '../ai/ai.config.service';
const conversations = {};
const lastActivity = {};
export class ConversationService {
    static async getFilteredConversation(jid, maxContextMessages = 10) {
        const fullConversation = await this.getConversation(jid);
        // Se não houver muitas mensagens, retorna tudo
        if (fullConversation.length <= maxContextMessages + 1) {
            return fullConversation;
        }
        // Sempre inclui o system prompt
        const systemMessage = fullConversation.find(msg => msg.role === 'system');
        const recentMessages = fullConversation
            .filter(msg => msg.role !== 'system')
            .slice(-maxContextMessages);
        return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
    }
    static async getConversation(jid) {
        if (!conversations[jid]) {
            const config = await AIConfigService.loadConfig();
            conversations[jid] = [
                { role: 'system', content: config.botContext?.systemPrompt || 'Você é um atendente profissional.' }
            ];
            lastActivity[jid] = Date.now();
        }
        return conversations[jid];
    }
    static async addMessage(jid, role, content) {
        const config = await AIConfigService.loadConfig();
        // Garante que a conversa existe
        if (!conversations[jid]) {
            conversations[jid] = [
                { role: 'system', content: config.botContext?.systemPrompt || 'Você é um atendente profissional.' }
            ];
        }
        conversations[jid].push({ role, content, timestamp: Date.now() });
        lastActivity[jid] = Date.now();
        // Limita histórico conforme configuração
        const maxHistory = config.botContext?.maxHistoryLength || 20;
        if (conversations[jid].length > maxHistory) {
            conversations[jid] = [
                conversations[jid][0],
                ...conversations[jid].slice(-(maxHistory - 1))
            ];
        }
    }
    static clearConversation(jid) {
        delete conversations[jid];
        delete lastActivity[jid];
    }
    static getConversationStats(jid) {
        const conversation = conversations[jid] || [];
        const userMessages = conversation.filter(msg => msg.role === 'user').length;
        const assistantMessages = conversation.filter(msg => msg.role === 'assistant').length;
        const lastActivityTime = lastActivity[jid];
        return {
            userMessages,
            assistantMessages,
            totalMessages: conversation.length,
            lastActivity: lastActivityTime ? new Date(lastActivityTime) : null
        };
    }
}
