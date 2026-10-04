// FrameCopy Figma plugin: paste a design copied from the FrameCopy editor
// and it is rebuilt as real Figma frames, text, shapes and images.
import { DesignSchema } from '@framecopy/shared'
import { buildDesign } from './buildDesign'

type UiMessage = { type: 'create'; text: string }

figma.showUI(__html__, { width: 360, height: 300, themeColors: true })

/** Accepts the clipboard format { framecopy: 1, design } or a bare design (e.g. an exported .json) */
function parseDesign(text: string) {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { error: "That isn't FrameCopy data. In FrameCopy, click Copy to Figma, then paste here." }
  }
  const candidate = (json as { framecopy?: unknown; design?: unknown })?.framecopy ? (json as { design: unknown }).design : json
  const result = DesignSchema.safeParse(candidate)
  if (!result.success) {
    const issue = result.error.issues[0]
    return { error: `This design is not valid (${issue.path.join('.') || 'root'}: ${issue.message}).` }
  }
  return { design: result.data }
}

figma.ui.onmessage = async (msg: UiMessage) => {
  if (msg.type !== 'create') return
  const parsed = parseDesign(msg.text)
  if (!parsed.design) {
    figma.ui.postMessage({ type: 'error', message: parsed.error })
    return
  }

  try {
    const { frame, missingFonts, layerCount } = await buildDesign(parsed.design)
    figma.currentPage.selection = [frame]
    figma.viewport.scrollAndZoomIntoView([frame])

    const fontNote = missingFonts.length ? ` Used Inter instead of: ${missingFonts.join(', ')}.` : ''
    figma.notify(`Created "${frame.name}" with ${layerCount} layers.${fontNote}`)
    figma.ui.postMessage({ type: 'done', layerCount, missingFonts })
  } catch (err) {
    figma.ui.postMessage({ type: 'error', message: `Couldn't create the design: ${err instanceof Error ? err.message : String(err)}` })
  }
}
