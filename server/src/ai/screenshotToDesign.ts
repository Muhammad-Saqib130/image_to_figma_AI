import { GoogleGenAI, type Content } from '@google/genai'
import { DesignSchema, type Design } from '@framecopy/shared'
import { imageSize } from 'image-size'
import { detectImageType } from '../lib/imageType.js'
import { buildDesignPrompt, buildRetryPrompt } from './prompt.js'

export const DEFAULT_MODEL = 'gemini-2.5-flash'

type Options = {
  apiKey: string
  model?: string
  /** Called with progress messages, e.g. to log them */
  onLog?: (message: string) => void
}

/** Thrown when the model still returns an invalid design after the retry */
export class InvalidDesignError extends Error {
  constructor(
    message: string,
    readonly lastResponse: string,
  ) {
    super(message)
  }
}

/**
 * Sends a screenshot to Gemini and returns a validated Design.
 * If the first answer is invalid, retries once with the problems listed.
 */
export async function screenshotToDesign(image: Buffer, options: Options): Promise<Design> {
  const { apiKey, model = DEFAULT_MODEL, onLog = () => {} } = options

  const mimeType = detectImageType(image)
  if (!mimeType) throw new Error('Unsupported image. Use a PNG, JPG or WEBP file.')
  const { width, height } = imageSize(image)

  const ai = new GoogleGenAI({ apiKey })
  const contents: Content[] = [
    {
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: image.toString('base64') } },
        { text: buildDesignPrompt(width, height) },
      ],
    },
  ]

  const maxAttempts = 2
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onLog(`Attempt ${attempt}/${maxAttempts}: asking ${model} (${width}x${height} image)...`)
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { responseMimeType: 'application/json', temperature: 0.2 },
    })
    const text = response.text ?? ''

    const result = validate(text, width, height)
    if (result.ok) {
      onLog(`Attempt ${attempt}: valid design.`)
      return result.design
    }

    onLog(`Attempt ${attempt}: invalid answer:\n${result.message}`)
    if (attempt === maxAttempts) {
      throw new InvalidDesignError(`Model returned an invalid design ${maxAttempts} times`, text)
    }
    // Show the model its own answer and what was wrong with it
    contents.push(
      { role: 'model', parts: [{ text }] },
      { role: 'user', parts: [{ text: buildRetryPrompt(result.message) }] },
    )
  }
  throw new Error('unreachable')
}

type ValidationResult = { ok: true; design: Design } | { ok: false; message: string }

function validate(text: string, width: number, height: number): ValidationResult {
  let json: unknown
  try {
    // Tolerate ```json fences even though the prompt forbids them
    json = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch (err) {
    return { ok: false, message: `- The answer is not valid JSON (${(err as Error).message}).` }
  }

  const result = DesignSchema.safeParse(json)
  if (!result.success) {
    // Cap the list so the retry prompt stays small
    const issues = result.error.issues.slice(0, 20)
    const lines = issues.map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
    if (result.error.issues.length > issues.length) {
      lines.push(`- ...and ${result.error.issues.length - issues.length} more problems`)
    }
    return { ok: false, message: lines.join('\n') }
  }

  if (result.data.width !== width || result.data.height !== height) {
    return {
      ok: false,
      message: `- width/height must be ${width} and ${height}, got ${result.data.width} and ${result.data.height}.`,
    }
  }
  return { ok: true, design: result.data }
}
