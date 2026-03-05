import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { Boom } from '@hapi/boom'

export async function createSession(sessionId: string) {
  const { state, saveCreds } = await useMultiFileAuthState(`auth/${sessionId}`)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Bot', 'Chrome', '120.0.0']
  })

  sock.ev.on('creds.update', saveCreds)

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
        createSession(sessionId)
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