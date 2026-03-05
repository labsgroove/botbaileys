import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
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

type CreateSessionOptions = {
  onIncomingMessage?: (message: IncomingMessage) => void
  onHistoryMessage?: (message: IncomingMessage & { id?: string }) => void
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
      const jid = incoming.key?.remoteJid
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
        name: incoming.pushName
      })
    }
  })

  sock.ev.on('messaging-history.set', ({ messages }) => {
    for (const historyMessage of messages || []) {
      const jid = historyMessage.key?.remoteJid
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
        name: historyMessage.pushName
      })
    }
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
