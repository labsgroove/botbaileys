import { jidNormalizedUser } from '@whiskeysockets/baileys'

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
  aliases: Record<string, string>
}

const store: Record<string, SessionChats> = {}

function normalizeJid(jid: string): string {
  const normalized = jidNormalizedUser(jid)
  return normalized || String(jid || '').trim().toLowerCase()
}

function ensureSession(sessionId: string): SessionChats {
  if (!store[sessionId]) {
    store[sessionId] = { messages: {}, meta: {}, aliases: {} }
  }

  return store[sessionId]
}

function resolveJid(session: SessionChats, jid: string): string {
  const normalized = normalizeJid(jid)
  if (!normalized) {
    return ''
  }

  let current = session.aliases[normalized] || normalized
  const visited = [normalized]

  while (session.aliases[current] && session.aliases[current] !== current) {
    const next = session.aliases[current]

    if (!next || visited.includes(next)) {
      break
    }

    visited.push(current)
    current = next
  }

  for (const alias of visited) {
    session.aliases[alias] = current
  }

  session.aliases[current] = current
  return current
}

function ensureChatByCanonical(session: SessionChats, jid: string) {
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

  session.aliases[jid] = jid

  return {
    messages: session.messages[jid],
    meta: session.meta[jid]
  }
}

function ensureChat(session: SessionChats, jid: string) {
  const canonicalJid = resolveJid(session, jid)

  if (!canonicalJid) {
    return null
  }

  return {
    jid: canonicalJid,
    ...ensureChatByCanonical(session, canonicalJid)
  }
}

function jidPriority(jid: string): number {
  if (jid.endsWith('@s.whatsapp.net')) {
    return 3
  }

  if (jid.endsWith('@lid')) {
    return 1
  }

  return 2
}

function isLidJid(jid: string) {
  return jid.endsWith('@lid')
}

function isPhoneJid(jid: string) {
  return jid.endsWith('@s.whatsapp.net')
}

function canMergeAliases(firstJid: string, secondJid: string) {
  if (!firstJid || !secondJid || firstJid === secondJid) {
    return true
  }

  return (isLidJid(firstJid) && isPhoneJid(secondJid)) || (isPhoneJid(firstJid) && isLidJid(secondJid))
}

function hasChat(session: SessionChats, jid: string) {
  return !!session.messages[jid] || !!session.meta[jid]
}

function chooseCanonicalJid(session: SessionChats, candidates: string[]) {
  return [...candidates].sort((firstJid, secondJid) => {
    const firstHasChat = hasChat(session, firstJid) ? 1 : 0
    const secondHasChat = hasChat(session, secondJid) ? 1 : 0

    if (firstHasChat !== secondHasChat) {
      return secondHasChat - firstHasChat
    }

    const firstPriority = jidPriority(firstJid)
    const secondPriority = jidPriority(secondJid)

    if (firstPriority !== secondPriority) {
      return secondPriority - firstPriority
    }

    const firstTimestamp = session.meta[firstJid]?.lastTimestamp || 0
    const secondTimestamp = session.meta[secondJid]?.lastTimestamp || 0
    return secondTimestamp - firstTimestamp
  })[0]
}

function choosePreferredJid(session: SessionChats, firstJid: string, secondJid: string) {
  const firstPriority = jidPriority(firstJid)
  const secondPriority = jidPriority(secondJid)

  if (firstPriority !== secondPriority) {
    return firstPriority > secondPriority ? firstJid : secondJid
  }

  const firstTimestamp = session.meta[firstJid]?.lastTimestamp || 0
  const secondTimestamp = session.meta[secondJid]?.lastTimestamp || 0
  return firstTimestamp >= secondTimestamp ? firstJid : secondJid
}

function mergeChats(session: SessionChats, targetJid: string, sourceJid: string): string {
  const resolvedTarget = resolveJid(session, targetJid)
  const resolvedSource = resolveJid(session, sourceJid)

  if (!resolvedTarget) {
    return resolvedSource
  }

  if (!resolvedSource || resolvedTarget === resolvedSource) {
    return resolvedTarget
  }

  const target = ensureChatByCanonical(session, resolvedTarget)
  const sourceMessages = session.messages[resolvedSource] || []
  const sourceMeta = session.meta[resolvedSource]
  const existingIds = new Set(target.messages.map((message) => message.id))

  for (const message of sourceMessages) {
    if (existingIds.has(message.id)) {
      continue
    }

    target.messages.push({
      ...message,
      jid: resolvedTarget
    })

    existingIds.add(message.id)
  }

  target.messages.sort((a, b) => a.timestamp - b.timestamp)

  if (sourceMeta) {
    target.meta.unread += sourceMeta.unread

    if (sourceMeta.lastTimestamp >= target.meta.lastTimestamp) {
      target.meta.lastTimestamp = sourceMeta.lastTimestamp
      target.meta.lastMessage = sourceMeta.lastMessage
    }

    if (!target.meta.name && sourceMeta.name) {
      target.meta.name = sourceMeta.name
    }
  }

  delete session.messages[resolvedSource]
  delete session.meta[resolvedSource]

  session.aliases[resolvedSource] = resolvedTarget

  for (const [alias, canonical] of Object.entries(session.aliases)) {
    if (canonical === resolvedSource) {
      session.aliases[alias] = resolvedTarget
    }
  }

  return resolvedTarget
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
  const chat = ensureChat(session, jid)

  if (!chat) {
    return
  }

  const normalizedTimestamp = Number.isFinite(timestamp) ? timestamp : Date.now()
  const id = options.id || nextMessageId(chat.jid, normalizedTimestamp)
  const alreadyExists = chat.messages.some((message) => message.id === id)

  if (alreadyExists) {
    return
  }

  chat.messages.push({
    id,
    jid: chat.jid,
    text,
    direction: fromMe ? 'outbound' : 'inbound',
    fromMe,
    timestamp: normalizedTimestamp
  })

  if (!fromMe && options.countUnread !== false) {
    chat.meta.unread += 1
  }

  if (normalizedTimestamp >= chat.meta.lastTimestamp) {
    chat.meta.lastTimestamp = normalizedTimestamp
    chat.meta.lastMessage = text
  }

  const normalizedName = options.name?.trim()
  if (normalizedName) {
    chat.meta.name = normalizedName
  }
}

export class ChatStore {
  static upsertContact(
    sessionId: string,
    payload: {
      id?: string
      jid?: string
      lid?: string
      name?: string
      notify?: string
      verifiedName?: string
    }
  ) {
    const session = ensureSession(sessionId)
    const candidates = [payload.jid, payload.id, payload.lid]
      .map((value) => (value ? normalizeJid(value) : ''))
      .filter((value, index, all) => !!value && all.indexOf(value) === index)

    if (!candidates.length) {
      return
    }

    const resolvedCandidates = Array.from(
      new Set(candidates.map((jid) => resolveJid(session, jid)).filter((jid) => !!jid))
    )
    let canonicalJid = chooseCanonicalJid(session, resolvedCandidates)

    if (!canonicalJid) {
      return
    }

    for (const candidate of resolvedCandidates) {
      if (candidate === canonicalJid || !canMergeAliases(canonicalJid, candidate)) {
        continue
      }

      if (hasChat(session, canonicalJid) || hasChat(session, candidate)) {
        const preferredJid = choosePreferredJid(session, canonicalJid, candidate)
        const otherJid = preferredJid === canonicalJid ? candidate : canonicalJid
        canonicalJid = mergeChats(session, preferredJid, otherJid)
        continue
      }

      const preferredJid = choosePreferredJid(session, canonicalJid, candidate)
      const otherJid = preferredJid === canonicalJid ? candidate : canonicalJid
      canonicalJid = preferredJid
      session.aliases[canonicalJid] = canonicalJid
      session.aliases[otherJid] = canonicalJid
    }

    for (const candidate of candidates) {
      const resolved = resolveJid(session, candidate)

      if (!resolved) {
        continue
      }

      if (canMergeAliases(canonicalJid, resolved)) {
        session.aliases[candidate] = canonicalJid
        session.aliases[resolved] = canonicalJid
        continue
      }

      session.aliases[candidate] = resolved
      session.aliases[resolved] = resolved
    }

    const preferredName = [payload.name, payload.notify, payload.verifiedName]
      .map((value) => value?.trim())
      .find((value) => !!value)

    if (preferredName) {
      for (const resolvedJid of resolvedCandidates) {
        const currentJid = resolveJid(session, resolvedJid)
        const currentMeta = currentJid ? session.meta[currentJid] : undefined

        if (currentMeta) {
          currentMeta.name = preferredName
        }
      }
    }
  }

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

  static resolveChatJid(sessionId: string, jid: string) {
    const session = ensureSession(sessionId)
    return resolveJid(session, jid)
  }

  static listChats(sessionId: string) {
    const session = ensureSession(sessionId)
    return Object.values(session.meta)
      .map((chat) => ({ ...chat }))
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
  }

  static getMessages(sessionId: string, jid: string) {
    const session = ensureSession(sessionId)
    const chat = ensureChat(session, jid)

    if (!chat) {
      return []
    }

    return [...chat.messages].sort((a, b) => a.timestamp - b.timestamp)
  }

  static markAsRead(sessionId: string, jid: string) {
    const session = ensureSession(sessionId)
    const chat = ensureChat(session, jid)

    if (!chat) {
      return
    }

    chat.meta.unread = 0
  }
}
