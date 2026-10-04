import { DesignSchema, type Design } from '@framecopy/shared'

const KEY = 'framecopy:last-project'

/** What the editor opens: the design plus a name for the project */
export type Project = {
  /** Shown in the editor's top bar, e.g. "resume" for resume.png */
  name: string
  design: Design
}

/** "my-site.final.png" -> "my-site.final" */
export function projectNameFromFile(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'Untitled'
}

/** Keeps the latest result for this tab, so /editor still works after a refresh */
export function saveProject(project: Project) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(project))
  } catch {
    // Storage can be full or blocked; the project is still passed via router state
  }
}

export function loadProject(): Project | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { name?: unknown; design?: unknown }
    const design = DesignSchema.safeParse(data.design)
    if (!design.success) return null
    return { name: typeof data.name === 'string' ? data.name : 'Untitled', design: design.data }
  } catch {
    return null
  }
}
