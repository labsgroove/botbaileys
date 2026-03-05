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
    browser: ['Bot', 'Chrome', '120.0.0']
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log(`Escaneie o QR da sessão ${sessionId}`)
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode

      console.log('Conexão fechada. Status:', statusCode)

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('Reconectando...')
        createSession(sessionId, options)
      } else {
        console.log('Sessão deslogada. Apague auth e conecte novamente.')
      }
    }

    if (connection === 'open') {
      console.log(`Sessão ${sessionId} conectada com sucesso.`)
    }
  })

  return sock
}
