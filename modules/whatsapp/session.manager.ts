import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser,
  Browsers
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { Boom } from '@hapi/boom'

type IncomingMessage = {
  id?: string
  jid: string
  text: string
  fromMe: boolean
  timestamp: number
  name?: string
}

type ContactUpdate = {
  id?: string
  jid?: string
  lid?: string
  name?: string
  notify?: string
  verifiedName?: string
}

type CreateSessionOptions = {
  onIncomingMessage?: (message: IncomingMessage) => void
  onHistoryMessage?: (message: IncomingMessage) => void
  onHistoryChat?: (chat: {
    jid: string
    name?: string
    unread?: number
    lastTimestamp?: number
    lastMessage?: string
  }) => void
  onContactUpdate?: (contact: ContactUpdate) => void
  onConnectionUpdate?: (state: {
    connection?: string
    qr?: string
    statusCode?: number
    isLoggedOut: boolean
  }) => void
}

function normalizeTimestamp(value: any): number | undefined {
  if (value === null || typeof value === 'undefined') {
    return undefined
  }

  const numericValue =
    typeof value === 'object' && typeof value.toNumber === 'function'
      ? Number(value.toNumber())
      : Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined
  }

  // WhatsApp usually sends seconds; some updates may already arrive in milliseconds.
  return numericValue > 1_000_000_000_000 ? numericValue : numericValue * 1000
}

function unwrapMessageContent(message: any) {
  const wrappers = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
    'editedMessage',
    'deviceSentMessage'
  ]

  let content = message
  let depth = 0

  while (content && depth < wrappers.length) {
    const next = wrappers
      .map((wrapper) => content?.[wrapper]?.message)
      .find((value) => !!value)

    if (!next) {
      break
    }

    content = next
    depth += 1
  }

  return content
}

function extractText(message: any): string | null {
  const content = unwrapMessageContent(message)

  const text =
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    content?.documentMessage?.caption

  if (text) {
    return text
  }

  if (content?.imageMessage) return '[Imagem]'
  if (content?.videoMessage) return '[Video]'
  if (content?.audioMessage) return '[Audio]'
  if (content?.stickerMessage) return '[Sticker]'
  if (content?.documentMessage) return '[Documento]'
  if (content?.contactsArrayMessage || content?.contactMessage) return '[Contato]'
  if (content?.locationMessage || content?.liveLocationMessage) return '[Localizacao]'
  if (content?.pollCreationMessage || content?.pollCreationMessageV2 || content?.pollCreationMessageV3) return '[Enquete]'
  if (content?.reactionMessage) return '[Reacao]'

  return (
    null
  )
}

function normalizeJid(jid?: string | null): string | undefined {
  if (!jid) {
    return undefined
  }

  const normalized = jidNormalizedUser(jid)
  return normalized || undefined
}

function pickContactName(contact: { name?: string | null; notify?: string | null; verifiedName?: string | null }) {
  const name = contact.name?.trim()
  if (name) {
    return name
  }

  const notify = contact.notify?.trim()
  if (notify) {
    return notify
  }

  return contact.verifiedName?.trim() || undefined
}

function emitContactUpdate(
  options: CreateSessionOptions,
  payload: {
    id?: string | null
    jid?: string | null
    lid?: string | null
    name?: string | null
    notify?: string | null
    verifiedName?: string | null
  }
) {
  const contact: ContactUpdate = {
    id: normalizeJid(payload.id),
    jid: normalizeJid(payload.jid),
    lid: normalizeJid(payload.lid),
    name: payload.name?.trim() || undefined,
    notify: payload.notify?.trim() || undefined,
    verifiedName: payload.verifiedName?.trim() || undefined
  }

  if (!contact.id && !contact.jid && !contact.lid) {
    return
  }

  options.onContactUpdate?.(contact)
}

function emitChatSnapshot(
  options: CreateSessionOptions,
  payload: {
    id?: string | null
    name?: string | null
    unreadCount?: number | string | null
    conversationTimestamp?: number | string | { toNumber: () => number } | null
    lastMessageRecvTimestamp?: number | string | { toNumber: () => number } | null
  },
  namesByJid?: Map<string, string>
) {
  const jid = normalizeJid(payload.id)

  if (!jid || jid === 'status@broadcast') {
    return
  }

  const unreadValue = Number(payload.unreadCount || 0)
  const normalizedUnread = Number.isFinite(unreadValue) && unreadValue >= 0 ? Math.floor(unreadValue) : 0
  const conversationTs = normalizeTimestamp(payload.conversationTimestamp)
  const recvTs = normalizeTimestamp(payload.lastMessageRecvTimestamp)

  options.onHistoryChat?.({
    jid,
    name: payload.name?.trim() || namesByJid?.get(jid),
    unread: normalizedUnread,
    lastTimestamp: conversationTs || recvTs
  })
}

export async function createSession(sessionId: string, options: CreateSessionOptions = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(`auth/${sessionId}`)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const incoming of messages) {
      const jid = normalizeJid(incoming.key?.remoteJid)
      const text = extractText(incoming.message)

      if (!jid || !text || jid === 'status@broadcast') {
        continue
      }

      const unixTimestamp = Number(incoming.messageTimestamp || Math.floor(Date.now() / 1000))

      options.onIncomingMessage?.({
        id: incoming.key?.id,
        jid,
        text,
        fromMe: !!incoming.key?.fromMe,
        timestamp: unixTimestamp * 1000,
        name: incoming.pushName?.trim() || undefined
      })
    }
  })

  sock.ev.on('messaging-history.set', ({ messages, contacts, chats }) => {
    const totalHistoryMessages = messages?.length || 0
    const historyNamesByJid = new Map<string, string>()
    let importedMessages = 0
    let skippedMessages = 0

    for (const contact of contacts || []) {
      emitContactUpdate(options, {
        id: contact.id,
        jid: contact.jid,
        lid: contact.lid,
        name: contact.name,
        notify: contact.notify,
        verifiedName: contact.verifiedName
      })

      const name = pickContactName(contact)
      if (!name) {
        continue
      }

      const knownJids = [normalizeJid(contact.id), normalizeJid(contact.jid), normalizeJid(contact.lid)].filter(
        (jid): jid is string => !!jid
      )

      for (const jid of knownJids) {
        historyNamesByJid.set(jid, name)
      }
    }

    for (const historyChat of chats || []) {
      emitChatSnapshot(
        options,
        {
          id: historyChat.id,
          name: historyChat.name,
          unreadCount: historyChat.unreadCount,
          conversationTimestamp: historyChat.conversationTimestamp,
          lastMessageRecvTimestamp: historyChat.lastMessageRecvTimestamp
        },
        historyNamesByJid
      )
    }

    for (const historyMessage of messages || []) {
      const jid = normalizeJid(historyMessage.key?.remoteJid)
      const text = extractText(historyMessage.message)

      if (!jid || jid === 'status@broadcast' || !text) {
        skippedMessages += 1
        continue
      }

      const unixTimestamp = Number(historyMessage.messageTimestamp || Math.floor(Date.now() / 1000))

      importedMessages += 1
      options.onHistoryMessage?.({
        id: historyMessage.key?.id,
        jid,
        text,
        fromMe: !!historyMessage.key?.fromMe,
        timestamp: unixTimestamp * 1000,
        name: historyMessage.pushName?.trim() || historyNamesByJid.get(jid)
      })
    }

    console.log(
      `[${sessionId}] Historico recebido: total=${totalHistoryMessages}, importadas=${importedMessages}, ignoradas=${skippedMessages}, contatos=${contacts?.length || 0}`
    )
  })

  sock.ev.on('chats.upsert', (chats) => {
    if (Array.isArray(chats) && chats.length) {
      console.log(`[${sessionId}] chats.upsert recebidos: ${chats.length}`)
    }

    for (const chat of chats || []) {
      emitChatSnapshot(options, {
        id: chat.id,
        name: chat.name,
        unreadCount: chat.unreadCount,
        conversationTimestamp: chat.conversationTimestamp,
        lastMessageRecvTimestamp: chat.lastMessageRecvTimestamp
      })
    }
  })

  sock.ev.on('chats.update', (chats) => {
    if (Array.isArray(chats) && chats.length) {
      console.log(`[${sessionId}] chats.update recebidos: ${chats.length}`)
    }

    for (const chat of chats || []) {
      emitChatSnapshot(options, {
        id: chat.id,
        name: chat.name,
        unreadCount: chat.unreadCount,
        conversationTimestamp: chat.conversationTimestamp,
        lastMessageRecvTimestamp: chat.lastMessageRecvTimestamp
      })
    }
  })

  sock.ev.on('contacts.upsert', (contacts) => {
    for (const contact of contacts || []) {
      emitContactUpdate(options, {
        id: contact.id,
        jid: contact.jid,
        lid: contact.lid,
        name: contact.name,
        notify: contact.notify,
        verifiedName: contact.verifiedName
      })
    }
  })

  sock.ev.on('contacts.update', (contacts) => {
    for (const contact of contacts || []) {
      emitContactUpdate(options, {
        id: contact.id,
        jid: contact.jid,
        lid: contact.lid,
        name: contact.name,
        notify: contact.notify,
        verifiedName: contact.verifiedName
      })
    }
  })

  sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
    emitContactUpdate(options, {
      id: jid,
      jid,
      lid
    })
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
    const isLoggedOut = statusCode === DisconnectReason.loggedOut

    options.onConnectionUpdate?.({
      connection,
      qr,
      statusCode,
      isLoggedOut
    })

    if (qr) {
      console.log(`Escaneie o QR da sessão ${sessionId}`)
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      console.log('Conexão fechada. Status:', statusCode)

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('Sessão deslogada. Apague auth e conecte novamente.')
      }
    }

    if (connection === 'open') {
      console.log(`Sessão ${sessionId} conectada com sucesso.`)
    }
  })

  return sock
}
