import { Router } from 'express'
import { AIConfigService } from '../modules/ai/ai.config.service'
import { LLMService } from '../modules/llm/llm.service'

const router = Router()

// Obter configuração atual
router.get('/config', async (req, res) => {
  try {
    const config = await AIConfigService.loadConfig()
    // Não retornar a API key por segurança
    const safeConfig = {
      ...config,
      googleAI: config.googleAI ? {
        ...config.googleAI,
        apiKey: config.googleAI.apiKey ? '***' : ''
      } : undefined
    }
    res.json(safeConfig)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar configuração' })
  }
})

// Salvar configuração
router.post('/config', async (req, res) => {
  try {
    const config = req.body
    
    // Validar configuração
    if (config.provider === 'google-ai' && !config.googleAI?.apiKey) {
      return res.status(400).json({ error: 'API Key do Google AI é obrigatória' })
    }
    
    if (config.provider === 'lm-studio' && !config.lmStudio?.url) {
      return res.status(400).json({ error: 'URL do LM Studio é obrigatória' })
    }
    
    await AIConfigService.saveConfig(config)
    await LLMService.reloadConfig()
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configuração' })
  }
})

// Testar conexão com Google AI
router.post('/test-google-ai', async (req, res) => {
  try {
    const { apiKey, model = 'gemini-2.5-flash' } = req.body
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API Key é obrigatória' })
    }
    
    const isValid = await AIConfigService.testGoogleAIConnection(apiKey, model)
    res.json({ valid: isValid })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao testar conexão' })
  }
})

// Obter modelos disponíveis do Google AI
router.post('/google-ai-models', async (req, res) => {
  try {
    const { apiKey } = req.body
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API Key é obrigatória' })
    }
    
    const models = await AIConfigService.getGoogleAIModels(apiKey)
    res.json({ models })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter modelos' })
  }
})

export default router
