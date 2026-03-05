type MessageDirection = 'inbound' | 'outbound'

export type ChatMessage = {
  id: string
  jid: string
  text: string
  direction: MessageDirection
  fromMe: boolean
  timestamp: number
}

type ChatMeta = {
  jid: string
  name?: string
  unread: number
  lastTimestamp: number
  lastMessage: string
}

type SessionChats = {
  messages: Record<string, ChatMessage[]>
  meta: Record<string, ChatMeta>
}

const store: Record<string, SessionChats> = {}

function ensureSession(sessionId: string): SessionChats {
  if (!store[sessionId]) {
    store[sessionId] = { messages: {}, meta: {} }
  }

  return store[sessionId]
}

function ensureChat(session: SessionChats, jid: string): ChatMessage[] {
  if (!session.messages[jid]) {
    session.messages[jid] = []
  }

  if (!session.meta[jid]) {
    session.meta[jid] = {
      jid,
      unread: 0,
      lastTimestamp: 0,
      lastMessage: ''
    }
  }

  return session.messages[jid]
}

function nextMessageId(jid: string, timestamp: number) {
  return `${jid}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`
}

export class ChatStore {
  static addIncoming(sessionId: string, jid: string, text: string, timestamp = Date.now(), name?: string) {
    const session = ensureSession(sessionId)
    const messages = ensureChat(session, jid)

    messages.push({
      id: nextMessageId(jid, timestamp),
      jid,
      text,
      direction: 'inbound',
      fromMe: false,
      timestamp
    })

    session.meta[jid].unread += 1
    session.meta[jid].lastTimestamp = timestamp
    session.meta[jid].lastMessage = text

    if (name) {
      session.meta[jid].name = name
    }
  }

  static addOutgoing(sessionId: string, jid: string, text: string, timestamp = Date.now()) {
    const session = ensureSession(sessionId)
    const messages = ensureChat(session, jid)

    messages.push({
      id: nextMessageId(jid, timestamp),
      jid,
      text,
      direction: 'outbound',
      fromMe: true,
      timestamp
    })

    session.meta[jid].lastTimestamp = timestamp
    session.meta[jid].lastMessage = text
  }

  static listChats(sessionId: string) {
    const session = ensureSession(sessionId)

    return Object.values(session.meta).sort((a, b) => b.lastTimestamp - a.lastTimestamp)
  }

  static getMessages(sessionId: string, jid: string) {
    const session = ensureSession(sessionId)
    const messages = ensureChat(session, jid)
    return messages
  }

  static markAsRead(sessionId: string, jid: string) {
    const session = ensureSession(sessionId)
    ensureChat(session, jid)
    session.meta[jid].unread = 0
  }
}
