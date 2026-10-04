import { ApiError } from '@google/genai'
import { Router, type ErrorRequestHandler, type Response } from 'express'
import multer from 'multer'
import { formatWait, QuotaExhaustedError } from '../ai/geminiRetry.js'
import { InvalidDesignError, screenshotToDesign } from '../ai/screenshotToDesign.js'
import { getAiConfig } from '../config.js'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, detectImageType } from '../lib/imageType.js'

const TYPE_ERROR = 'Unsupported file type. Please upload a PNG, JPG or WEBP image.'

class UnsupportedTypeError extends Error {}

// Keep uploads in memory; nothing is written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Some clients send unknown types (e.g. .webp) as octet-stream; the byte check below decides
    if (ACCEPTED_IMAGE_TYPES.includes(file.mimetype) || file.mimetype === 'application/octet-stream') {
      cb(null, true)
    } else {
      cb(new UnsupportedTypeError(TYPE_ERROR))
    }
  },
})

export const convertRouter = Router()

convertRouter.post('/convert', upload.single('image'), async (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ ok: false, error: 'No image uploaded. Send it in the "image" field.' })
    return
  }
  // The declared type can be faked, so also check the actual bytes
  if (!detectImageType(file.buffer)) {
    res.status(415).json({ ok: false, error: TYPE_ERROR })
    return
  }

  const { apiKey, model, fallbackModel } = getAiConfig()
  if (!apiKey) {
    console.error('[convert] AI_API_KEY is not set in server/.env')
    res.status(500).json({ ok: false, error: 'The server is missing its AI API key. Add AI_API_KEY to server/.env.' })
    return
  }

  const started = Date.now()
  console.log(`[convert] ${file.originalname} (${Math.round(file.size / 1024)} KB)`)
  try {
    const design = await screenshotToDesign(file.buffer, {
      apiKey,
      model,
      fallbackModel,
      onLog: (message) => console.log(`[convert] ${message}`),
    })
    console.log(`[convert] done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
    res.json({ ok: true, design })
  } catch (err) {
    sendAiError(res, err)
  }
})

/** Maps AI failures to a status code and a message that's safe to show on the page */
function sendAiError(res: Response, err: unknown) {
  console.error('[convert] failed:', err instanceof Error ? err.message : err)

  if (err instanceof InvalidDesignError) {
    res.status(502).json({ ok: false, error: "The AI couldn't produce a valid design for this image. Please try again." })
  } else if (err instanceof QuotaExhaustedError) {
    const resets = err.retryAfterSeconds ? ` It resets in about ${formatWait(err.retryAfterSeconds)}.` : ''
    res.status(429).json({
      ok: false,
      error:
        `The AI's ${err.daily ? 'free daily limit' : 'usage limit'} is used up for ${err.models.join(' and ')}.${resets} ` +
        'To keep going now, set a different AI_MODEL or GEMINI_FALLBACK_MODEL in server/.env and restart the server.',
    })
  } else if (err instanceof ApiError && err.status === 429) {
    res.status(429).json({ ok: false, error: 'The AI is getting too many requests right now. Please wait a minute and try again.' })
  } else if (err instanceof ApiError && err.status === 503) {
    res.status(503).json({ ok: false, error: 'The AI is very busy right now. Please try again in a few minutes.' })
  } else if (err instanceof ApiError && [400, 401, 403].includes(err.status) && /key|auth|credential/i.test(err.message)) {
    // Don't leak details about the key to the browser
    res.status(500).json({ ok: false, error: "The server's AI API key was rejected. Check AI_API_KEY in server/.env." })
  } else {
    res.status(500).json({ ok: false, error: 'Something went wrong while recreating the design. Please try again.' })
  }
}

// Turn multer errors into clear JSON responses
const handleUploadError: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof UnsupportedTypeError) {
    res.status(415).json({ ok: false, error: TYPE_ERROR })
    return
  }
  if (!(err instanceof multer.MulterError)) {
    next(err)
    return
  }
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      res.status(413).json({ ok: false, error: 'Image is too large. The maximum size is 20 MB.' })
      return
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      // More than one file, or a file in a field other than "image"
      res.status(400).json({ ok: false, error: 'Send exactly one image in the "image" field.' })
      return
    default:
      res.status(400).json({ ok: false, error: err.message })
  }
}

convertRouter.use(handleUploadError)
