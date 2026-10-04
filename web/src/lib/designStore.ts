import { DesignSchema, type Design } from '@framecopy/shared'

const KEY = 'framecopy:last-design'

/** Keeps the latest result for this tab, so /editor still works after a refresh */
export function saveDesign(design: Design) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(design))
  } catch {
    // Storage can be full or blocked; the design is still passed via router state
  }
}

export function loadDesign(): Design | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = DesignSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
