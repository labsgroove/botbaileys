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

router.get('/session/:id/messages/:jid', (req, res) => {
  const { id, jid } = req.params
  const session = WhatsAppService.getSession(id)

  if (!session) {
    return res.status(404).json({ error: 'Sessao nao encontrada' })
  }

  const messages = ChatStore.getMessages(id, jid)
  ChatStore.markAsRead(id, jid)

  return res.json({ messages })
})

router.post('/session/:id/messages', async (req, res) => {
  const { id } = req.params
  const { jid, text } = req.body as { jid?: string; text?: string }

  if (!jid || !text) {
    return res.status(400).json({ error: 'jid e text sao obrigatorios' })
  }

  try {
    await WhatsAppService.sendMessage(id, jid, text)
    return res.json({ ok: true })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro ao enviar mensagem' })
  }
})

export default router
