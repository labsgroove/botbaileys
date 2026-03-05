import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { Boom } from '@hapi/boom'

type IncomingMessage = {
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
  onHistoryMessage?: (message: IncomingMessage & { id?: string }) => void
  onContactUpdate?: (contact: ContactUpdate) => void
  onConnectionUpdate?: (state: {
    connection?: string
    qr?: string
    statusCode?: number
    isLoggedOut: boolean
  }) => void
}

function extractText(message: any): string | null {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
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

export async function createSession(sessionId: string, options: CreateSessionOptions = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(`auth/${sessionId}`)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Bot', 'Chrome', '120.0.0'],
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
        jid,
        text,
        fromMe: !!incoming.key?.fromMe,
        timestamp: unixTimestamp * 1000,
        name: incoming.pushName?.trim() || undefined
      })
    }
  })

  sock.ev.on('messaging-history.set', ({ messages, contacts }) => {
    const historyNamesByJid = new Map<string, string>()

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

    for (const historyMessage of messages || []) {
      const jid = normalizeJid(historyMessage.key?.remoteJid)
      const text = extractText(historyMessage.message)

      if (!jid || !text || jid === 'status@broadcast') {
        continue
      }

      const unixTimestamp = Number(historyMessage.messageTimestamp || Math.floor(Date.now() / 1000))

      options.onHistoryMessage?.({
        id: historyMessage.key?.id,
        jid,
        text,
        fromMe: !!historyMessage.key?.fromMe,
        timestamp: unixTimestamp * 1000,
        name: historyMessage.pushName?.trim() || historyNamesByJid.get(jid)
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
