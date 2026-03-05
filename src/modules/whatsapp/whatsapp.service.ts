import { WASocket } from '@whiskeysockets/baileys'
import { createSession } from './session.manager.js'
import { ChatStore } from '../chat/chat.store.js'

const sessions: Map<string, WASocket> = new Map()

export class WhatsAppService {

  static async initSession(sessionId: string) {
    if (sessions.has(sessionId)) {
      return sessions.get(sessionId)
    }

    const sock = await createSession(sessionId, {
      onIncomingMessage: (message) => {
        if (message.fromMe) {
          return
        }

        ChatStore.addIncoming(sessionId, message.jid, message.text, message.timestamp, message.name)
      }
    })

    sessions.set(sessionId, sock)

    return sock
  }

  static getSession(sessionId: string) {
    return sessions.get(sessionId)
  }

  static async sendMessage(sessionId: string, jid: string, text: string) {
    const sock = sessions.get(sessionId)

    if (!sock) {
      throw new Error('Sessão não encontrada')
    }

    await sock.sendMessage(jid, { text })
    ChatStore.addOutgoing(sessionId, jid, text)
  }

  static async closeSession(sessionId: string) {
    const sock = sessions.get(sessionId)

    if (sock) {
      await sock.logout()
      sessions.delete(sessionId)
    }
  }

  static listSessions() {
    return Array.from(sessions.keys())
  }
}
