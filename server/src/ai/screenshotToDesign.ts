import { GoogleGenAI, MediaResolution, type Content } from '@google/genai'
import { DesignSchema, type Design } from '@framecopy/shared'
import { imageSize } from 'image-size'
import { detectImageType } from '../lib/imageType.js'
import { extractImages } from './extractImages.js'
import { DEFAULT_RETRY_DELAYS_MS, isOverloaded, isQuotaExhausted, toQuotaError, withRetry } from './geminiRetry.js'
import { gridToPixels } from './gridToPixels.js'
import { buildDesignPrompt, buildRetryPrompt } from './prompt.js'

export const DEFAULT_MODEL = 'gemini-2.5-flash'

type Options = {
  apiKey: string
  model?: string
  /** Tried once if `model` is still overloaded (503) after all retries */
  fallbackModel?: string
  /** Waits between retries on 429/503 */
  retryDelaysMs?: number[]
  /** Cut photos/icons out of the screenshot into image layers (default true) */
  extractImages?: boolean
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
  const {
    apiKey,
    model = DEFAULT_MODEL,
    fallbackModel,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    extractImages: shouldExtractImages = true,
    onLog = () => {},
  } = options

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

  // Switches to the fallback model for the rest of this conversion if the main one is overloaded
  let activeModel = model
  const generate = async (): Promise<string> => {
    const request = (m: string) => () =>
      ai.models.generateContent({
        model: m,
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          // Zoomed-in image reading helps with small text and exact positions
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
        },
      })
    try {
      const response = await withRetry(request(activeModel), { delaysMs: retryDelaysMs, onLog })
      return response.text ?? ''
    } catch (err) {
      // Each model has its own quota, so the fallback helps when the main one is busy or used up
      const canFallBack = (isOverloaded(err) || isQuotaExhausted(err)) && fallbackModel && activeModel !== fallbackModel
      if (!canFallBack) throw toQuotaError(err, [activeModel])
      const why = isOverloaded(err) ? 'is still busy' : 'has used up its quota'
      onLog(`${activeModel} ${why}. Trying fallback model ${fallbackModel} once...`)
      const triedModels = [activeModel, fallbackModel]
      activeModel = fallbackModel
      try {
        const response = await request(activeModel)()
        return response.text ?? ''
      } catch (fallbackErr) {
        throw toQuotaError(fallbackErr, triedModels)
      }
    }
  }

  const maxAttempts = 2
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onLog(`Attempt ${attempt}/${maxAttempts}: asking ${activeModel} (${width}x${height} image)...`)
    const text = await generate()

    const result = validate(text)
    if (result.ok) {
      onLog(`Attempt ${attempt}: valid design.`)
      const design = gridToPixels(result.design, width, height)
      if (!shouldExtractImages) return design
      const withImages = await extractImages(design, image)
      onLog(`Cut ${countImages(withImages.layers)} image(s) out of the screenshot.`)
      return withImages
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

function countImages(layers: Design['layers']): number {
  return layers.reduce(
    (n, l) =>
      n + (l.type === 'image' && l.src.startsWith('data:') ? 1 : 0) + (l.type === 'frame' ? countImages(l.children) : 0),
    0,
  )
}

function validate(text: string): ValidationResult {
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
  return { ok: true, design: result.data }
}
