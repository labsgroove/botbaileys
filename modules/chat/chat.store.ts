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

function upsertMessage(
  sessionId: string,
  jid: string,
  text: string,
  fromMe: boolean,
  timestamp: number,
  options: { id?: string; name?: string; countUnread?: boolean } = {}
) {
  const session = ensureSession(sessionId)
  const messages = ensureChat(session, jid)
  const id = options.id || nextMessageId(jid, timestamp)
  const alreadyExists = messages.some((message) => message.id === id)

  if (alreadyExists) {
    return
  }

  messages.push({
    id,
    jid,
    text,
    direction: fromMe ? 'outbound' : 'inbound',
    fromMe,
    timestamp
  })

  if (!fromMe && options.countUnread !== false) {
    session.meta[jid].unread += 1
  }

  session.meta[jid].lastTimestamp = Math.max(session.meta[jid].lastTimestamp, timestamp)
  session.meta[jid].lastMessage = text

  if (options.name) {
    session.meta[jid].name = options.name
  }
}

export class ChatStore {
  static addIncoming(sessionId: string, jid: string, text: string, timestamp = Date.now(), name?: string) {
    upsertMessage(sessionId, jid, text, false, timestamp, { name, countUnread: true })
  }

  static addOutgoing(sessionId: string, jid: string, text: string, timestamp = Date.now()) {
    upsertMessage(sessionId, jid, text, true, timestamp)
  }

  static addHistory(
    sessionId: string,
    payload: {
      id?: string
      jid: string
      text: string
      fromMe: boolean
      timestamp: number
      name?: string
    }
  ) {
    upsertMessage(
      sessionId,
      payload.jid,
      payload.text,
      payload.fromMe,
      payload.timestamp,
      { id: payload.id, name: payload.name, countUnread: false }
    )
  }

  static listChats(sessionId: string) {
    const session = ensureSession(sessionId)

    return Object.values(session.meta).sort((a, b) => b.lastTimestamp - a.lastTimestamp)
  }

  static getMessages(sessionId: string, jid: string) {
    const session = ensureSession(sessionId)
    const messages = ensureChat(session, jid)
    return messages.sort((a, b) => a.timestamp - b.timestamp)
  }

  static markAsRead(sessionId: string, jid: string) {
    const session = ensureSession(sessionId)
    ensureChat(session, jid)
    session.meta[jid].unread = 0
  }
}
