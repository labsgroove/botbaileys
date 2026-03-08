type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const conversations: Record<string, Message[]> = {}

const SYSTEM_PROMPT = `
Você é um atendente profissional.
Responda de forma objetiva.
Nunca invente informações.
`

export class ConversationService {
  static getConversation(jid: string) {
    if (!conversations[jid]) {
      conversations[jid] = [
        { role: 'system', content: SYSTEM_PROMPT }
      ]
    }

    return conversations[jid]
  }

  static addMessage(jid: string, role: Message['role'], content: string) {
    // Garante que a conversa existe
    if (!conversations[jid]) {
      conversations[jid] = [
        { role: 'system', content: SYSTEM_PROMPT }
      ]
    }
    
    conversations[jid].push({ role, content })

    // Limita histórico (evita estourar contexto)
    if (conversations[jid].length > 20) {
      conversations[jid] = [
        conversations[jid][0],
        ...conversations[jid].slice(-18)
      ]
    }
  }
}