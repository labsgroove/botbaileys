import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import { Boom } from '@hapi/boom'

type MessageKind =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'sticker'
  | 'document'
  | 'contact'
  | 'location'
  | 'poll'
  | 'reaction'
  | 'interactive'
  | 'system'
  | 'unknown'

type SessionMessage = {
  id?: string
  jid: string
  text?: string
  fromMe: boolean
  timestamp: number
  name?: string
  participant?: string
  type?: MessageKind
  status?: number
  rawType?: string
  media?: {
    kind: 'image' | 'video' | 'audio' | 'sticker' | 'document'
    mimetype?: string
    fileName?: string
    caption?: string
    seconds?: number
    fileLength?: number
    hasMedia?: boolean
    mediaKeyTs?: number
  }
  reaction?: {
    targetId?: string
    emoji?: string
  }
  interactive?: {
    kind: 'buttons' | 'list' | 'template' | 'native' | 'response' | 'unknown'
    title?: string
    body?: string
    footer?: string
    selectedId?: string
    selectedText?: string
    options?: Array<{ id: string; title: string; description?: string }>
  }
  quoted?: {
    id?: string
    participant?: string
    text?: string
  }
  isEdited?: boolean
  isDeleted?: boolean
  targetMessageId?: string
  raw?: any
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
  onIncomingMessage?: (message: SessionMessage) => void
  onHistoryMessage?: (message: SessionMessage) => void
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
  onMessageUpdate?: (update: {
    id: string
    jid: string
    text?: string
    timestamp?: number
    status?: number
    type?: MessageKind
    rawType?: string
    media?: SessionMessage['media']
    interactive?: SessionMessage['interactive']
    quoted?: SessionMessage['quoted']
    isEdited?: boolean
    isDeleted?: boolean
    participant?: string
    name?: string
  }) => void
  onMessageDelete?: (payload: { jid: string; messageId: string; timestamp?: number }) => void
  onReaction?: (payload: {
    jid: string
    messageId: string
    emoji?: string
    actor?: string
    fromMe?: boolean
    timestamp?: number
  }) => void
  onMessageReceipt?: (payload: {
    jid: string
    messageId: string
    participant?: string
    status: 'server_ack' | 'delivery_ack' | 'read' | 'played'
    timestamp?: number
  }) => void
  onPresenceUpdate?: (payload: { jid: string; participant: string; lastKnownPresence?: string }) => void
  onEvent?: (payload: { name: string; summary: string }) => void
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

function pickQuoted(content: any) {
  const context =
    content?.extendedTextMessage?.contextInfo ||
    content?.imageMessage?.contextInfo ||
    content?.videoMessage?.contextInfo ||
    content?.documentMessage?.contextInfo ||
    content?.buttonsResponseMessage?.contextInfo ||
    content?.interactiveResponseMessage?.contextInfo

  if (!context) {
    return undefined
  }

  const quotedText =
    context?.quotedMessage?.conversation ||
    context?.quotedMessage?.extendedTextMessage?.text ||
    context?.quotedMessage?.imageMessage?.caption ||
    context?.quotedMessage?.videoMessage?.caption ||
    context?.quotedMessage?.documentMessage?.caption

  return {
    id: context?.stanzaId || undefined,
    participant: normalizeJid(context?.participant) || undefined,
    text: quotedText || undefined
  }
}

function parseInteractive(content: any): SessionMessage['interactive'] {
  if (content?.buttonsMessage) {
    const buttons = (content.buttonsMessage.buttons || []).map((button: any) => ({
      id: button?.buttonId || '',
      title: button?.buttonText?.displayText || button?.buttonId || 'Opcao'
    }))

    return {
      kind: 'buttons',
      title: content.buttonsMessage?.headerText || undefined,
      body: content.buttonsMessage?.contentText || '',
      footer: content.buttonsMessage?.footerText || undefined,
      options: buttons
    }
  }

  if (content?.listMessage) {
    const options: Array<{ id: string; title: string; description?: string }> = []
    for (const section of content.listMessage.sections || []) {
      for (const row of section?.rows || []) {
        options.push({
          id: row?.rowId || '',
          title: row?.title || row?.rowId || 'Item',
          description: row?.description || undefined
        })
      }
    }

    return {
      kind: 'list',
      title: content.listMessage?.title || undefined,
      body: content.listMessage?.description || '',
      footer: content.listMessage?.footerText || undefined,
      options
    }
  }

  if (content?.templateMessage) {
    return {
      kind: 'template',
      body: '[Mensagem template]'
    }
  }

  if (content?.interactiveMessage) {
    return {
      kind: 'native',
      title: content.interactiveMessage?.header?.title || undefined,
      body: content.interactiveMessage?.body?.text || '',
      footer: content.interactiveMessage?.footer?.text || undefined
    }
  }

  if (content?.buttonsResponseMessage) {
    return {
      kind: 'response',
      selectedId: content.buttonsResponseMessage?.selectedButtonId || undefined,
      selectedText: content.buttonsResponseMessage?.selectedDisplayText || undefined,
      body: content.buttonsResponseMessage?.selectedDisplayText || '[Resposta de botao]'
    }
  }

  if (content?.listResponseMessage) {
    return {
      kind: 'response',
      selectedId: content.listResponseMessage?.singleSelectReply?.selectedRowId || undefined,
      selectedText: content.listResponseMessage?.title || undefined,
      body: content.listResponseMessage?.title || '[Resposta de lista]'
    }
  }

  if (content?.templateButtonReplyMessage) {
    return {
      kind: 'response',
      selectedId: content.templateButtonReplyMessage?.selectedId || undefined,
      selectedText: content.templateButtonReplyMessage?.selectedDisplayText || undefined,
      body: content.templateButtonReplyMessage?.selectedDisplayText || '[Resposta de template]'
    }
  }

  if (content?.interactiveResponseMessage) {
    const nativeResponse = content.interactiveResponseMessage?.nativeFlowResponseMessage
    return {
      kind: 'response',
      selectedId: nativeResponse?.name || undefined,
      selectedText: nativeResponse?.paramsJson || undefined,
      body: '[Resposta interativa]'
    }
  }

  return undefined
}

function parseMessagePayload(message: any): SessionMessage | null {
  const jid = normalizeJid(message?.key?.remoteJid)
  if (!jid || jid === 'status@broadcast') {
    return null
  }

  const timestamp = normalizeTimestamp(message?.messageTimestamp) || Date.now()
  const content = unwrapMessageContent(message?.message)
  const participant = normalizeJid(message?.key?.participant)
  const quoted = pickQuoted(content)

  const base: SessionMessage = {
    id: message?.key?.id,
    jid,
    fromMe: !!message?.key?.fromMe,
    timestamp,
    name: message?.pushName?.trim() || undefined,
    participant,
    type: 'unknown',
    raw: message,
    quoted
  }

  if (!content) {
    base.type = 'system'
    base.text = '[Evento sem conteudo]'
    return base
  }

  if (content?.conversation) {
    return {
      ...base,
      type: 'text',
      text: content.conversation
    }
  }

  if (content?.extendedTextMessage?.text) {
    return {
      ...base,
      type: 'text',
      text: content.extendedTextMessage.text
    }
  }

  if (content?.imageMessage) {
    return {
      ...base,
      type: 'image',
      text: content.imageMessage.caption || '[Imagem]',
      media: {
        kind: 'image',
        mimetype: content.imageMessage.mimetype || undefined,
        caption: content.imageMessage.caption || undefined,
        fileLength: Number(content.imageMessage.fileLength || 0) || undefined,
        hasMedia: true,
        mediaKeyTs: normalizeTimestamp(content.imageMessage.mediaKeyTimestamp)
      }
    }
  }

  if (content?.videoMessage) {
    return {
      ...base,
      type: 'video',
      text: content.videoMessage.caption || '[Video]',
      media: {
        kind: 'video',
        mimetype: content.videoMessage.mimetype || undefined,
        caption: content.videoMessage.caption || undefined,
        seconds: Number(content.videoMessage.seconds || 0) || undefined,
        fileLength: Number(content.videoMessage.fileLength || 0) || undefined,
        hasMedia: true,
        mediaKeyTs: normalizeTimestamp(content.videoMessage.mediaKeyTimestamp)
      }
    }
  }

  if (content?.audioMessage) {
    return {
      ...base,
      type: 'audio',
      text: '[Audio]',
      media: {
        kind: 'audio',
        mimetype: content.audioMessage.mimetype || undefined,
        seconds: Number(content.audioMessage.seconds || 0) || undefined,
        fileLength: Number(content.audioMessage.fileLength || 0) || undefined,
        hasMedia: true,
        mediaKeyTs: normalizeTimestamp(content.audioMessage.mediaKeyTimestamp)
      }
    }
  }

  if (content?.stickerMessage) {
    return {
      ...base,
      type: 'sticker',
      text: '[Sticker]',
      media: {
        kind: 'sticker',
        mimetype: content.stickerMessage.mimetype || undefined,
        hasMedia: true,
        mediaKeyTs: normalizeTimestamp(content.stickerMessage.mediaKeyTimestamp)
      }
    }
  }

  if (content?.documentMessage) {
    return {
      ...base,
      type: 'document',
      text: content.documentMessage.caption || content.documentMessage.fileName || '[Documento]',
      media: {
        kind: 'document',
        mimetype: content.documentMessage.mimetype || undefined,
        fileName: content.documentMessage.fileName || undefined,
        caption: content.documentMessage.caption || undefined,
        fileLength: Number(content.documentMessage.fileLength || 0) || undefined,
        hasMedia: true,
        mediaKeyTs: normalizeTimestamp(content.documentMessage.mediaKeyTimestamp)
      }
    }
  }

  if (content?.contactMessage || content?.contactsArrayMessage) {
    return {
      ...base,
      type: 'contact',
      text: '[Contato]'
    }
  }

  if (content?.locationMessage || content?.liveLocationMessage) {
    return {
      ...base,
      type: 'location',
      text: '[Localizacao]'
    }
  }

  if (content?.pollCreationMessage || content?.pollCreationMessageV2 || content?.pollCreationMessageV3) {
    const pollName =
      content?.pollCreationMessage?.name ||
      content?.pollCreationMessageV2?.name ||
      content?.pollCreationMessageV3?.name

    return {
      ...base,
      type: 'poll',
      text: pollName ? `[Enquete] ${pollName}` : '[Enquete]'
    }
  }

  if (content?.reactionMessage) {
    return {
      ...base,
      type: 'reaction',
      text: content.reactionMessage.text ? `[Reacao] ${content.reactionMessage.text}` : '[Reacao removida]',
      reaction: {
        targetId: content.reactionMessage.key?.id || undefined,
        emoji: content.reactionMessage.text || undefined
      },
      targetMessageId: content.reactionMessage.key?.id || undefined
    }
  }

  const interactive = parseInteractive(content)
  if (interactive) {
    return {
      ...base,
      type: 'interactive',
      text: interactive.body || '[Mensagem interativa]',
      interactive
    }
  }

  if (content?.protocolMessage) {
    const protocol = content.protocolMessage

    if (protocol?.type === 0 && protocol?.key?.id) {
      return {
        ...base,
        type: 'system',
        text: '[Mensagem apagada]',
        isDeleted: true,
        targetMessageId: protocol.key.id
      }
    }

    if (protocol?.editedMessage) {
      const edited = parseMessagePayload({
        key: message.key,
        message: protocol.editedMessage,
        messageTimestamp: message.messageTimestamp,
        pushName: message.pushName
      })

      return {
        ...base,
        type: edited?.type || 'text',
        text: edited?.text || '[Mensagem editada]',
        media: edited?.media,
        interactive: edited?.interactive,
        quoted: edited?.quoted,
        isEdited: true,
        targetMessageId: protocol?.key?.id || message?.key?.id
      }
    }

    return {
      ...base,
      type: 'system',
      text: '[Atualizacao de mensagem]'
    }
  }

  const firstType = Object.keys(content || {})[0]
  return {
    ...base,
    type: 'unknown',
    text: '[Mensagem nao suportada]',
    rawType: firstType || undefined
  }
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

function receiptStatus(receipt: any): 'server_ack' | 'delivery_ack' | 'read' | 'played' {
  if (receipt?.playedTimestamp || receipt?.playedTimestampMs) {
    return 'played'
  }

  if (receipt?.readTimestamp || receipt?.readTimestampMs) {
    return 'read'
  }

  if (receipt?.receiptTimestamp || receipt?.receiptTimestampMs) {
    return 'delivery_ack'
  }

  return 'server_ack'
}

function emitEvent(options: CreateSessionOptions, name: string, summary: string) {
  options.onEvent?.({ name, summary })
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

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    emitEvent(options, 'messages.upsert', `Mensagens ${type}: ${messages?.length || 0}`)

    for (const incoming of messages || []) {
      const parsed = parseMessagePayload(incoming)

      if (!parsed) {
        continue
      }

      if (parsed.type === 'reaction' && parsed.targetMessageId) {
        options.onReaction?.({
          jid: parsed.jid,
          messageId: parsed.targetMessageId,
          emoji: parsed.reaction?.emoji,
          actor: parsed.participant || parsed.jid,
          fromMe: parsed.fromMe,
          timestamp: parsed.timestamp
        })
        continue
      }

      if (parsed.isDeleted && parsed.targetMessageId) {
        options.onMessageDelete?.({
          jid: parsed.jid,
          messageId: parsed.targetMessageId,
          timestamp: parsed.timestamp
        })
        continue
      }

      options.onIncomingMessage?.(parsed)
    }
  })

  sock.ev.on('messages.update', (updates) => {
    emitEvent(options, 'messages.update', `Atualizacoes de mensagem: ${updates?.length || 0}`)

    for (const item of updates || []) {
      const jid = normalizeJid(item?.key?.remoteJid)
      const id = item?.key?.id

      if (!jid || !id) {
        continue
      }

      if (item.update?.status !== undefined) {
        options.onMessageUpdate?.({
          id,
          jid,
          status: Number(item.update.status)
        })
      }

      if (!item.update?.message) {
        continue
      }

      const parsed = parseMessagePayload({
        key: item.key,
        message: item.update.message,
        messageTimestamp: item.update.messageTimestamp,
        pushName: undefined
      })

      if (!parsed) {
        continue
      }

      if (parsed.type === 'reaction' && parsed.targetMessageId) {
        options.onReaction?.({
          jid,
          messageId: parsed.targetMessageId,
          emoji: parsed.reaction?.emoji,
          actor: parsed.participant,
          fromMe: parsed.fromMe,
          timestamp: parsed.timestamp
        })
        continue
      }

      if (parsed.isDeleted && parsed.targetMessageId) {
        options.onMessageDelete?.({
          jid,
          messageId: parsed.targetMessageId,
          timestamp: parsed.timestamp
        })
        continue
      }

      options.onMessageUpdate?.({
        id: parsed.targetMessageId || id,
        jid,
        text: parsed.text,
        timestamp: parsed.timestamp,
        status: item.update?.status !== undefined ? Number(item.update.status) : undefined,
        type: parsed.type,
        rawType: parsed.rawType,
        media: parsed.media,
        interactive: parsed.interactive,
        quoted: parsed.quoted,
        isEdited: parsed.isEdited,
        isDeleted: parsed.isDeleted,
        participant: parsed.participant,
        name: parsed.name
      })
    }
  })

  sock.ev.on('messages.delete', (event) => {
    if ('keys' in event && Array.isArray(event.keys)) {
      emitEvent(options, 'messages.delete', `Mensagens apagadas: ${event.keys.length}`)

      for (const key of event.keys) {
        const jid = normalizeJid(key?.remoteJid)
        const id = key?.id

        if (!jid || !id) {
          continue
        }

        options.onMessageDelete?.({
          jid,
          messageId: id,
          timestamp: Date.now()
        })
      }

      return
    }

    if ('jid' in event) {
      emitEvent(options, 'messages.delete', `Todas as mensagens apagadas no chat ${event.jid}`)
    }
  })

  sock.ev.on('messages.reaction', (events) => {
    emitEvent(options, 'messages.reaction', `Reacoes: ${events?.length || 0}`)

    for (const reactionEvent of events || []) {
      const jid = normalizeJid(reactionEvent?.key?.remoteJid)
      const messageId = reactionEvent?.key?.id

      if (!jid || !messageId) {
        continue
      }

      options.onReaction?.({
        jid,
        messageId,
        emoji: reactionEvent?.reaction?.text || undefined,
        actor: normalizeJid(reactionEvent?.reaction?.key?.participant) || undefined,
        fromMe: !!reactionEvent?.reaction?.key?.fromMe,
        timestamp: normalizeTimestamp(reactionEvent?.reaction?.senderTimestampMs)
      })
    }
  })

  sock.ev.on('message-receipt.update', (events) => {
    emitEvent(options, 'message-receipt.update', `Receipts: ${events?.length || 0}`)

    for (const receiptEvent of events || []) {
      const jid = normalizeJid(receiptEvent?.key?.remoteJid)
      const messageId = receiptEvent?.key?.id

      if (!jid || !messageId) {
        continue
      }

      options.onMessageReceipt?.({
        jid,
        messageId,
        participant: normalizeJid(receiptEvent?.receipt?.userJid) || undefined,
        status: receiptStatus(receiptEvent?.receipt),
        timestamp:
          normalizeTimestamp(receiptEvent?.receipt?.playedTimestamp) ||
          normalizeTimestamp(receiptEvent?.receipt?.readTimestamp) ||
          normalizeTimestamp(receiptEvent?.receipt?.receiptTimestamp)
      })
    }
  })

  sock.ev.on('presence.update', (event) => {
    const jid = normalizeJid(event?.id)

    if (!jid) {
      return
    }

    const participants = Object.entries(event?.presences || {})

    emitEvent(options, 'presence.update', `Presencas atualizadas: ${participants.length}`)

    for (const [participant, presence] of participants) {
      options.onPresenceUpdate?.({
        jid,
        participant: normalizeJid(participant) || participant,
        lastKnownPresence: (presence as any)?.lastKnownPresence || undefined
      })
    }
  })

  sock.ev.on('messaging-history.set', ({ messages, contacts, chats }) => {
    const totalHistoryMessages = messages?.length || 0
    const historyNamesByJid = new Map<string, string>()
    let importedMessages = 0
    let skippedMessages = 0

    emitEvent(
      options,
      'messaging-history.set',
      `Historico: mensagens=${totalHistoryMessages}, contatos=${contacts?.length || 0}, chats=${chats?.length || 0}`
    )

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

      for (const knownJid of knownJids) {
        historyNamesByJid.set(knownJid, name)
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
      const parsed = parseMessagePayload(historyMessage)

      if (!parsed) {
        skippedMessages += 1
        continue
      }

      if (!parsed.name) {
        parsed.name = historyNamesByJid.get(parsed.jid)
      }

      importedMessages += 1
      options.onHistoryMessage?.(parsed)
    }

    console.log(
      `[${sessionId}] Historico recebido: total=${totalHistoryMessages}, importadas=${importedMessages}, ignoradas=${skippedMessages}, contatos=${contacts?.length || 0}`
    )
  })

  sock.ev.on('chats.upsert', (chats) => {
    emitEvent(options, 'chats.upsert', `Chats upsert: ${chats?.length || 0}`)

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
    emitEvent(options, 'chats.update', `Chats update: ${chats?.length || 0}`)

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
    emitEvent(options, 'contacts.upsert', `Contatos novos: ${contacts?.length || 0}`)

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
    emitEvent(options, 'contacts.update', `Contatos atualizados: ${contacts?.length || 0}`)

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
    emitEvent(options, 'chats.phoneNumberShare', 'Mapeamento lid para phone number recebido')

    emitContactUpdate(options, {
      id: jid,
      jid,
      lid
    })
  })

  sock.ev.on('groups.upsert', (groups) => {
    emitEvent(options, 'groups.upsert', `Grupos carregados: ${groups?.length || 0}`)
  })

  sock.ev.on('groups.update', (groups) => {
    emitEvent(options, 'groups.update', `Grupos atualizados: ${groups?.length || 0}`)
  })

  sock.ev.on('group-participants.update', (event) => {
    emitEvent(
      options,
      'group-participants.update',
      `Grupo ${event.id}: ${event.action} (${event.participants?.length || 0} participante(s))`
    )
  })

  sock.ev.on('blocklist.set', (event) => {
    emitEvent(options, 'blocklist.set', `Blocklist total: ${event.blocklist?.length || 0}`)
  })

  sock.ev.on('blocklist.update', (event) => {
    emitEvent(options, 'blocklist.update', `Blocklist ${event.type}: ${event.blocklist?.length || 0}`)
  })

  sock.ev.on('call', (events) => {
    emitEvent(options, 'call', `Eventos de chamada: ${events?.length || 0}`)
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

    if (connection) {
      emitEvent(options, 'connection.update', `Conexao: ${connection}${statusCode ? ` (${statusCode})` : ''}`)
    }

    if (qr) {
      console.log(`Escaneie o QR da sessao ${sessionId}`)
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      console.log('Conexao fechada. Status:', statusCode)

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('Sessao deslogada. Apague auth e conecte novamente.')
      }
    }

    if (connection === 'open') {
      console.log(`Sessao ${sessionId} conectada com sucesso.`)
    }
  })

  return sock
}
