import { LLMService } from '../llm/llm.service';
import { ConversationService } from '../conversation/conversation.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { AIConfigService } from './ai.config.service';
import fs from 'fs/promises';
export class AIConversationService {
    static async loadStatus() {
        try {
            const data = await fs.readFile(this.statusFile, 'utf-8');
            const status = JSON.parse(data);
            this.enabledSessions = new Set(status.enabledSessions || []);
            console.log(`📂 Loaded AI status for ${this.enabledSessions.size} sessions`);
        }
        catch (error) {
            // Arquivo não existe, cria com status vazio
            this.enabledSessions = new Set();
            await this.saveStatus();
        }
    }
    static async saveStatus() {
        try {
            const status = {
                enabledSessions: Array.from(this.enabledSessions)
            };
            await fs.writeFile(this.statusFile, JSON.stringify(status, null, 2));
        }
        catch (error) {
            console.error('Error saving AI status:', error);
        }
    }
    static async enableAI(sessionId) {
        this.enabledSessions.add(sessionId);
        await this.saveStatus();
        console.log(`✅ AI enabled for session ${sessionId}`);
    }
    static async disableAI(sessionId) {
        this.enabledSessions.delete(sessionId);
        await this.saveStatus();
        console.log(`❌ AI disabled for session ${sessionId}`);
    }
    static isAIEnabled(sessionId) {
        return this.enabledSessions.has(sessionId);
    }
    static isGroupJid(jid) {
        return jid.endsWith('@g.us');
    }
    static isMention(text, botNumber) {
        const mention = `@${botNumber.replace('@s.whatsapp.net', '')}`;
        return text.includes(mention);
    }
    static isCommand(text, prefix) {
        return text.trim().startsWith(prefix);
    }
    static async processIncomingMessage(sessionId, jid, text) {
        console.log(`🔍 Processing message: sessionId=${sessionId}, jid=${jid}, text="${text}"`);
        // Verifica se IA está habilitada para esta sessão
        if (!this.isAIEnabled(sessionId)) {
            console.log(`❌ AI disabled for session ${sessionId}`);
            return;
        }
        // Ignora mensagens vazias ou apenas mídia
        if (!text || text.trim().length === 0) {
            console.log(`❌ Empty message, ignoring`);
            return;
        }
        // Verifica se é mensagem de grupo
        const isGroup = this.isGroupJid(jid);
        if (isGroup) {
            console.log(`👥 Message from group: ${jid}`);
            // Carrega configuração de grupos
            const config = await AIConfigService.loadConfig();
            const groupSettings = config.groupSettings;
            // Se IA para grupos estiver desabilitada, ignora
            if (!groupSettings?.enabled) {
                console.log(`❌ AI disabled for groups`);
                return;
            }
            // Verifica se deve responder a menções ou comandos
            const shouldRespondToMentions = groupSettings.respondToMentions;
            const shouldRespondToCommands = groupSettings.respondToCommands;
            const commandPrefix = groupSettings.commandPrefix;
            // Para obter o número do bot, precisamos da sessão do WhatsApp
            // Por ora, vamos verificar apenas comandos
            const isCommand = this.isCommand(text, commandPrefix);
            if (!shouldRespondToCommands && !shouldRespondToMentions) {
                console.log(`❌ AI not configured to respond in groups`);
                return;
            }
            if (shouldRespondToCommands && isCommand) {
                console.log(`✅ Command detected, processing...`);
            }
            else if (shouldRespondToMentions) {
                // TODO: Implementar verificação de menções quando tivermos acesso ao número do bot
                console.log(`⚠️ Mention checking not implemented yet, processing anyway...`);
            }
            else {
                console.log(`❌ Message doesn't match group response criteria`);
                return;
            }
        }
        console.log(`✅ Processing message with AI...`);
        try {
            // Adiciona mensagem do usuário à conversa
            await ConversationService.addMessage(jid, 'user', text);
            // Obtém o histórico filtrado da conversa (contexto relevante)
            const conversation = await ConversationService.getFilteredConversation(jid, 10);
            console.log(`📝 Sending ${conversation.length} messages to AI (filtered context)`);
            // Envia para a IA processar
            const response = await LLMService.ask(conversation);
            console.log(`🤖 AI response: "${response}"`);
            // Adiciona resposta da IA à conversa
            await ConversationService.addMessage(jid, 'assistant', response);
            // Envia resposta de volta para o WhatsApp
            const payload = {
                jid,
                text: response,
                type: 'text'
            };
            await WhatsAppService.sendMessage(sessionId, payload);
            console.log(`✅ AI response sent to ${jid}${isGroup ? ' (group)' : ''}`);
        }
        catch (error) {
            console.error('❌ Error processing message with AI:', error);
            // Envia mensagem de erro opcional
            const errorPayload = {
                jid,
                text: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.',
                type: 'text'
            };
            await WhatsAppService.sendMessage(sessionId, errorPayload);
            console.log(`📤 Error message sent to ${jid}${isGroup ? ' (group)' : ''}`);
        }
    }
    static getAIStatus(sessionId) {
        return {
            enabled: this.isAIEnabled(sessionId)
        };
    }
    static async toggleAI(sessionId) {
        if (this.isAIEnabled(sessionId)) {
            await this.disableAI(sessionId);
            return { enabled: false };
        }
        else {
            await this.enableAI(sessionId);
            return { enabled: true };
        }
    }
}
AIConversationService.enabledSessions = new Set();
AIConversationService.statusFile = './config/ai-status.json';
