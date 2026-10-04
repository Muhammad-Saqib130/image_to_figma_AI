import { DEFAULT_MODEL } from './ai/screenshotToDesign.js'

/** AI settings from server/.env (read when called, so tests can change them) */
export function getAiConfig() {
  return {
    apiKey: process.env.AI_API_KEY || undefined,
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || undefined,
  }
}
