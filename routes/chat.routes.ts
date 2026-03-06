import { Router } from 'express'
import { WhatsAppService } from '../modules/whatsapp/whatsapp.service.js'
import { ChatStore } from '../modules/chat/chat.store.js'

const router = Router()

router.get('/session/:id/chats', (req, res) => {
  const { id } = req.params
  const session = WhatsAppService.getSession(id)

  if (!session) {
    return res.status(404).json({ error: 'Sessao nao encontrada' })
  }

  return res.json({ chats: ChatStore.listChats(id) })
})

router.get('/session/:id/events', (req, res) => {
  const { id } = req.params
  const session = WhatsAppService.getSession(id)

  if (!session) {
    return res.status(404).json({ error: 'Sessao nao encontrada' })
  }

  const limit = Number(req.query.limit || 80)

  return res.json({ events: ChatStore.listEvents(id, limit) })
})

router.get('/session/:id/messages/:jid', (req, res) => {
  const { id, jid } = req.params
  const session = WhatsAppService.getSession(id)

  if (!session) {
    return res.status(404).json({ error: 'Sessao nao encontrada' })
  }

  const resolvedJid = ChatStore.resolveChatJid(id, jid) || jid
  const messages = ChatStore.getMessages(id, resolvedJid)
  ChatStore.markAsRead(id, resolvedJid)

  return res.json({ jid: resolvedJid, messages })
})

router.get('/session/:id/media/:jid/:messageId', async (req, res) => {
  const { id, jid, messageId } = req.params
  const session = WhatsAppService.getSession(id)

  if (!session) {
    return res.status(404).json({ error: 'Sessao nao encontrada' })
  }

  try {
    const media = await WhatsAppService.getMediaContent(id, jid, messageId)
    return res.json(media)
  } catch (error: any) {
    return res.status(404).json({ error: error?.message || 'Midia nao encontrada' })
  }
})

router.post('/session/:id/messages', async (req, res) => {
  const { id } = req.params
  const session = WhatsAppService.getSession(id)

  if (!session) {
    return res.status(404).json({ error: 'Sessao nao encontrada' })
  }

  const {
    jid,
    type,
    text,
    mediaUrl,
    mediaDataUrl,
    mimetype,
    fileName,
    ptt,
    seconds,
    reaction,
    reactionMessageId,
    reactionEmoji,
    interactive
  } = req.body as {
    jid?: string
    type?: 'text' | 'media' | 'sticker' | 'reaction' | 'interactive'
    text?: string
    mediaUrl?: string
    mediaDataUrl?: string
    mimetype?: string
    fileName?: string
    ptt?: boolean
    seconds?: number
    reaction?: {
      messageId: string
      emoji?: string
      participant?: string
      fromMe?: boolean
    }
    reactionMessageId?: string
    reactionEmoji?: string
    interactive?: {
      mode?: 'buttons' | 'list'
      title?: string
      text?: string
      footer?: string
      buttonText?: string
      buttons?: Array<{ id: string; text: string }>
      sections?: Array<{
        title: string
        rows: Array<{ id: string; title: string; description?: string }>
      }>
    }
  }

  if (!jid) {
    return res.status(400).json({ error: 'jid e obrigatorio' })
  }

  const normalizedType = type || 'text'

  if (normalizedType === 'text' && !text?.trim()) {
    return res.status(400).json({ error: 'text e obrigatorio para mensagem de texto' })
  }

  if ((normalizedType === 'media' || normalizedType === 'sticker') && !mediaUrl && !mediaDataUrl) {
    return res.status(400).json({ error: 'mediaUrl ou mediaDataUrl e obrigatorio para envio de midia' })
  }

  try {
    const response = await WhatsAppService.sendMessage(id, {
      jid,
      type: normalizedType,
      text,
      mediaUrl,
      mediaDataUrl,
      mimetype,
      fileName,
      ptt,
      seconds,
      reaction: reaction ||
        (reactionMessageId
          ? {
              messageId: reactionMessageId,
              emoji: reactionEmoji
            }
          : undefined),
      interactive
    })

    return res.json({
      ok: true,
      messageId: response?.key?.id,
      remoteJid: response?.key?.remoteJid
    })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro ao enviar mensagem' })
  }
})

export default router
