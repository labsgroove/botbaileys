import express from 'express'
import sessionRoutes from './routes/session.routes.js'
import { env } from './config/env.js'

const app = express()

app.use(express.json())
app.use(sessionRoutes)

app.listen(env.PORT, () => {
  console.log(`Servidor rodando na porta ${env.PORT}`)
})