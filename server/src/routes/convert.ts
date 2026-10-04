import { Router, type ErrorRequestHandler } from 'express'
import multer from 'multer'
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

convertRouter.post('/convert', upload.single('image'), (req, res) => {
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

  res.json({ ok: true })
})

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
