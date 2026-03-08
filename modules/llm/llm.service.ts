import axios from 'axios'
import { env } from '../../config/env'

export class LLMService {
  static async ask(messages: any[]) {
    const response = await axios.post(env.LM_STUDIO_URL, {
      model: env.MODEL,
      messages,
      temperature: 0.7
    })

    return response.data.choices[0].message.content
  }
}