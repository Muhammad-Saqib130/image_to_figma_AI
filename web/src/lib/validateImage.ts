export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']

/** Returns an error message, or null if the file is an acceptable image. */
export function validateImage(file: File): string | null {
  const name = file.name.toLowerCase()
  const typeOk = file.type
    ? ACCEPTED_IMAGE_TYPES.includes(file.type)
    : ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))

  if (!typeOk) {
    return `"${file.name}" isn't supported. Please choose a PNG, JPG or WEBP image.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `"${file.name}" is ${mb} MB. The maximum size is 20 MB.`
  }
  if (file.size === 0) {
    return `"${file.name}" is empty. Please choose another image.`
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
