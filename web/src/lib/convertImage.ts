import { DesignSchema, type Design } from '@framecopy/shared'

export class ConvertError extends Error {}

type ConvertOptions = {
  /** Called with 0–100 while the image is uploading */
  onUploadProgress?: (percent: number) => void
  /** Called once the image has been fully sent and the server is working on it */
  onUploaded?: () => void
  signal?: AbortSignal
}

/**
 * Sends the image to POST /api/convert and returns the validated design.
 * Uses XMLHttpRequest (not fetch) so we can tell when the upload has finished.
 */
export function convertImage(file: File, options: ConvertOptions = {}): Promise<Design> {
  const { onUploadProgress, onUploaded, signal } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/convert')
    xhr.responseType = 'json'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onUploadProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.upload.onload = () => onUploaded?.()

    xhr.onload = () => {
      const body = xhr.response as { ok?: boolean; design?: unknown; error?: string } | null
      if (xhr.status < 200 || xhr.status >= 300 || !body?.ok) {
        reject(new ConvertError(body?.error ?? `The server responded with an error (${xhr.status}). Please try again.`))
        return
      }
      const parsed = DesignSchema.safeParse(body.design)
      if (!parsed.success) {
        reject(new ConvertError('The server sent back a design we could not read. Please try again.'))
        return
      }
      resolve(parsed.data)
    }
    xhr.onerror = () =>
      reject(new ConvertError("Couldn't reach the server. Make sure it's running and try again."))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))

    signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    const form = new FormData()
    form.append('image', file)
    xhr.send(form)
  })
}
