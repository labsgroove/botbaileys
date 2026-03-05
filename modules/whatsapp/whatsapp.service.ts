import { WASocket, jidNormalizedUser } from '@whiskeysockets/baileys'
import { existsSync, readdirSync } from 'fs'
import path from 'path'
import { ChatStore } from '../chat/chat.store.js'
import { createSession } from './session.manager.js'

const sessions: Map<string, WASocket> = new Map()
const reconnecting: Set<string> = new Set()

type SessionConnectionStatus = 'idle' | 'connecting' | 'qr' | 'connected' | 'closed'

type SessionState = {
  status: SessionConnectionStatus
  qr?: string
  lastStatusCode?: number
  updatedAt: number
}

const sessionStates: Map<string, SessionState> = new Map()

function setState(sessionId: string, next: Partial<SessionState>) {
  const current = sessionStates.get(sessionId)
  sessionStates.set(sessionId, {
    status: current?.status || 'idle',
    ...current,
    ...next,
    updatedAt: Date.now()
  })
}

export class WhatsAppService {
  static async initSession(sessionId: string, force = false) {
    if (!force && sessions.has(sessionId)) {
      return sessions.get(sessionId)
    }

    setState(sessionId, { status: 'connecting', qr: undefined, lastStatusCode: undefined })

    const sock = await createSession(sessionId, {
      onIncomingMessage: (message) => {
        if (message.fromMe) {
          ChatStore.addOutgoing(sessionId, message.jid, message.text, message.timestamp, message.id, message.name)
          return
        }

        ChatStore.addIncoming(sessionId, message.jid, message.text, message.timestamp, message.name, message.id)
      },
      onHistoryMessage: (message) => {
        ChatStore.addHistory(sessionId, {
          id: message.id,
          jid: message.jid,
          text: message.text,
          fromMe: message.fromMe,
          timestamp: message.timestamp,
          name: message.name
        })
      },
      onHistoryChat: (chat) => {
        ChatStore.upsertHistoryChat(sessionId, chat)
      },
      onContactUpdate: (contact) => {
        ChatStore.upsertContact(sessionId, contact)
      },
      onConnectionUpdate: ({ connection, qr, statusCode, isLoggedOut }) => {
        if (qr) {
          setState(sessionId, { status: 'qr', qr })
        }

        if (connection === 'open') {
          setState(sessionId, { status: 'connected', qr: undefined })
        }

        if (connection === 'close') {
          sessions.delete(sessionId)

          if (isLoggedOut) {
            setState(sessionId, { status: 'closed', qr: undefined, lastStatusCode: statusCode })
            return
          }

          setState(sessionId, { status: 'connecting', qr: undefined, lastStatusCode: statusCode })
          this.reconnectSession(sessionId)
        }
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

    const normalizedJid = jidNormalizedUser(jid)

    if (!normalizedJid) {
      throw new Error('jid invalido')
    }

    await sock.sendMessage(normalizedJid, { text })
    ChatStore.addOutgoing(sessionId, normalizedJid, text)
  }

  static async closeSession(sessionId: string) {
    const sock = sessions.get(sessionId)

    if (sock) {
      await sock.logout()
      sessions.delete(sessionId)
    }

    setState(sessionId, { status: 'closed', qr: undefined })
  }

  static listSessions() {
    return Array.from(sessions.keys())
  }

  static listStoredSessions() {
    const authDir = path.resolve('auth')

    if (!existsSync(authDir)) {
      return []
    }

    return readdirSync(authDir, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
  }

  static getSessionState(sessionId: string): SessionState {
    const existing = sessionStates.get(sessionId)

    if (existing) {
      return existing
    }

    const initialState: SessionState = {
      status: sessions.has(sessionId) ? 'connected' : 'idle',
      updatedAt: Date.now()
    }

    sessionStates.set(sessionId, initialState)
    return initialState
  }

  private static async reconnectSession(sessionId: string) {
    if (reconnecting.has(sessionId)) {
      return
    }

    reconnecting.add(sessionId)
    try {
      await this.initSession(sessionId, true)
    } catch {
      setState(sessionId, { status: 'connecting' })
    } finally {
      reconnecting.delete(sessionId)
    }
  }
}
