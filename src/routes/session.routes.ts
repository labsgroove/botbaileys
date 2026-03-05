import { Router } from 'express'
import { WhatsAppService } from '../modules/whatsapp/whatsapp.service.js'

const router = Router()

router.post('/session/:id', async (req, res) => {
  const { id } = req.params

  await WhatsAppService.initSession(id)

  res.json({ message: `Sessão ${id} iniciada` })
})

router.get('/sessions', (req, res) => {
  res.json({
    active: WhatsAppService.listSessions()
  })
})

router.delete('/session/:id', async (req, res) => {
  const { id } = req.params

  await WhatsAppService.closeSession(id)

  res.json({ message: `Sessão ${id} encerrada` })
})

export default router