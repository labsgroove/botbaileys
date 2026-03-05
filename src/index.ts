import express from 'express'
import sessionRoutes from './routes/session.routes.js'
import chatRoutes from './routes/chat.routes.js'
import { env } from './config/env.js'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, 'public')

app.use(express.json())
app.use(sessionRoutes)
app.use(chatRoutes)
app.use(express.static(publicDir))

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`)
})
