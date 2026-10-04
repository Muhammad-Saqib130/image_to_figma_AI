import { ApiError } from '@google/genai'

/** Waits between retries: 2s, 5s, 10s, then 20s (4 retries after the first try) */
export const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000]

/** 429 = rate limit, 503 = Gemini overloaded. Other errors (401, 404, ...) are real and not retried. */
const RETRYABLE_STATUSES = [429, 503]

export function isRetryable(err: unknown): boolean {
  return err instanceof ApiError && RETRYABLE_STATUSES.includes(err.status)
}

export function isOverloaded(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs `call`, retrying on 429/503 with the given delays.
 * Throws the last error once the retries run out, or straight away for any other error.
 */
export async function withRetry<T>(
  call: () => Promise<T>,
  { delaysMs = DEFAULT_RETRY_DELAYS_MS, onLog = () => {} }: { delaysMs?: number[]; onLog?: (message: string) => void } = {},
): Promise<T> {
  for (let retry = 0; ; retry++) {
    try {
      return await call()
    } catch (err) {
      if (!isRetryable(err) || retry >= delaysMs.length) throw err

      const seconds = delaysMs[retry] / 1000
      const reason = (err as ApiError).status === 429 ? 'Gemini rate limit reached' : 'Gemini is busy'
      onLog(`${reason}, retrying in ${seconds}s... (retry ${retry + 1} of ${delaysMs.length})`)
      await sleep(delaysMs[retry])
    }
  }
}
