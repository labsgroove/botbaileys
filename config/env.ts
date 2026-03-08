export const env = {
  PORT: 3000,
  LM_STUDIO_URL: 'http://127.0.0.1:1234/v1/chat/completions',
  MODEL: 'local-model',
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || '',
  CONFIG_FILE: './config/ai-config.json'
}