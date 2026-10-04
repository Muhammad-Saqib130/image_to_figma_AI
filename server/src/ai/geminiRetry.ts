import { ApiError } from '@google/genai'

/** Waits between retries: 2s, 5s, 10s, then 20s (4 retries after the first try) */
export const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000]

/** Longest wait Google may ask for that is still worth retrying for */
const MAX_SUGGESTED_WAIT_S = 60

/** 429 = rate limit, 503 = Gemini overloaded. Other errors (401, 404, ...) are real and not retried. */
const RETRYABLE_STATUSES = [429, 503]

export function isOverloaded(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503
}

type QuotaInfo = { retryAfterSeconds: number | null; daily: boolean }

/** Reads Google's RetryInfo/QuotaFailure details from a 429 error, if present */
export function quotaInfo(err: unknown): QuotaInfo | null {
  if (!(err instanceof ApiError) || err.status !== 429) return null
  let details: { '@type'?: string; retryDelay?: string; violations?: { quotaId?: string }[] }[] = []
  try {
    details = JSON.parse(err.message)?.error?.details ?? []
  } catch {
    // Not JSON: treat as a plain rate limit
  }
  const delay = details.find((d) => d.retryDelay)?.retryDelay // e.g. "27067s" or "1.5s"
  const retryAfterSeconds = delay ? Math.ceil(parseFloat(delay)) : null
  const daily = details.some((d) => d.violations?.some((v) => /PerDay/i.test(v.quotaId ?? '')))
  return { retryAfterSeconds, daily }
}

/**
 * True when retrying soon can't help: a daily quota is used up, or Google asks
 * us to wait longer than a minute.
 */
export function isQuotaExhausted(err: unknown): boolean {
  const info = quotaInfo(err)
  return !!info && (info.daily || (info.retryAfterSeconds ?? 0) > MAX_SUGGESTED_WAIT_S)
}

/** Thrown when the model's quota is used up (and no fallback model could take over) */
export class QuotaExhaustedError extends Error {
  constructor(
    /** Every model that was tried */
    readonly models: string[],
    readonly retryAfterSeconds: number | null,
    readonly daily: boolean,
  ) {
    const wait = retryAfterSeconds ? `; resets in ${formatWait(retryAfterSeconds)}` : ''
    super(`Gemini ${daily ? 'daily ' : ''}quota is used up for ${models.join(' and ')}${wait}`)
  }
}

/** Wraps a used-up-quota ApiError in a QuotaExhaustedError; other errors are returned as they are */
export function toQuotaError(err: unknown, models: string[]): unknown {
  if (!isQuotaExhausted(err)) return err
  const info = quotaInfo(err)!
  return new QuotaExhaustedError(models, info.retryAfterSeconds, info.daily)
}

/** 27067 -> "7h 31m" */
export function formatWait(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.ceil((seconds % 3600) / 60)
  if (h === 0) return `${Math.max(1, m)}m`
  return m === 60 ? `${h + 1}h` : `${h}h ${m}m`
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs `call`, retrying on 429/503 with the given delays (or longer, if Google asks).
 * Throws straight away for other errors and for a used-up quota, where waiting
 * a few seconds can't help; otherwise throws the last error once retries run out.
 */
export async function withRetry<T>(
  call: () => Promise<T>,
  { delaysMs = DEFAULT_RETRY_DELAYS_MS, onLog = () => {} }: { delaysMs?: number[]; onLog?: (message: string) => void } = {},
): Promise<T> {
  for (let retry = 0; ; retry++) {
    try {
      return await call()
    } catch (err) {
      if (!(err instanceof ApiError) || !RETRYABLE_STATUSES.includes(err.status)) throw err
      if (isQuotaExhausted(err)) {
        const info = quotaInfo(err)!
        const wait = info.retryAfterSeconds ? ` (resets in ${formatWait(info.retryAfterSeconds)})` : ''
        onLog(`Gemini ${info.daily ? 'daily ' : ''}quota is used up${wait}; not retrying.`)
        throw err
      }
      if (retry >= delaysMs.length) throw err

      // Respect a short wait suggested by Google if it's longer than ours
      const suggestedMs = (quotaInfo(err)?.retryAfterSeconds ?? 0) * 1000
      const waitMs = Math.max(delaysMs[retry], suggestedMs)
      const reason = err.status === 429 ? 'Gemini rate limit reached' : 'Gemini is busy'
      onLog(`${reason}, retrying in ${waitMs / 1000}s... (retry ${retry + 1} of ${delaysMs.length})`)
      await sleep(waitMs)
    }
  }
}
