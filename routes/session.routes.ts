import { Router } from 'express'
import { WhatsAppService } from '../modules/whatsapp/whatsapp.service'

const router = Router()

router.post('/session/:id', async (req, res) => {
  const { id } = req.params

  await WhatsAppService.initSession(id)

  res.json({
    message: `Sessão ${id} iniciada`,
    state: WhatsAppService.getSessionState(id)
  })
})

router.get('/sessions', (req, res) => {
  res.json({
    active: WhatsAppService.listSessions(),
    stored: WhatsAppService.listStoredSessions()
  })
})

router.get('/session/:id/status', (req, res) => {
  const { id } = req.params

  res.json({
    id,
    state: WhatsAppService.getSessionState(id)
  })
})

router.delete('/session/:id', async (req, res) => {
  const { id } = req.params

  await WhatsAppService.closeSession(id)

  res.json({ message: `Sessão ${id} encerrada` })
})

export default router
