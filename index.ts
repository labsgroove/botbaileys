import express from 'express'
import sessionRoutes from './routes/session.routes'
import chatRoutes from './routes/chat.routes'
import aiConfigRoutes from './routes/ai-config.routes'
import aiConversationRoutes from './routes/ai-conversation.routes'
import aiTestRoutes from './routes/ai-test.routes'
import authRoutes from './routes/auth.routes'
import { AIConversationService } from './modules/ai/ai.conversation.service'
import { env } from './config/env'
import { database } from './config/database'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { logger } from './utils/logger'

import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, 'public')

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:"]
    }
  }
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
})
app.use('/api', limiter)

// Body parsing with reasonable limits
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use('/api/auth', authRoutes)
app.use(sessionRoutes)
app.use(chatRoutes)
app.use('/api/ai', aiConfigRoutes)
app.use('/api/ai', aiConversationRoutes)
app.use('/api/ai', aiTestRoutes)
app.use(express.static(publicDir))

// Conectar ao MongoDB
database.connect().catch(error => {
  logger.error('Failed to connect to MongoDB', { error: error.message })
  process.exit(1)
})

// Carrega status da IA ao iniciar
AIConversationService.loadStatus().catch(error => {
  logger.error('Failed to load AI status', { error: error.message })
})

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.get('/auth', (req, res) => {
  res.sendFile(path.join(publicDir, 'auth.html'))
})

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`)
})
