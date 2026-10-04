import type { Design, Layer } from '@framecopy/shared'
import { hexToFills } from './colors'
import { FontPicker } from './fonts'

const PLACEHOLDER_FILL = hexToFills('#D4D4D8')

/** Same rule as the web editor: follow the screenshot's line breaks, don't re-wrap */
function autoResize(text: string, height: number, fontSize: number): TextNode['textAutoResize'] {
  if (text.includes('\n')) return 'WIDTH_AND_HEIGHT'
  return height < fontSize * 1.8 ? 'WIDTH_AND_HEIGHT' : 'HEIGHT'
}

/** "data:image/png;base64,..." -> bytes, or null for placeholders/URLs */
function dataUriBytes(src: string): Uint8Array | null {
  const match = /^data:image\/(?:png|jpe?g|gif);base64,(.+)$/.exec(src)
  return match ? figma.base64Decode(match[1]) : null
}

export type BuildResult = { frame: FrameNode; missingFonts: string[]; layerCount: number }

/** Creates the design as a top-level Figma frame on the current page */
export async function buildDesign(design: Design): Promise<BuildResult> {
  const fonts = await FontPicker.create()
  let layerCount = 0

  const root = figma.createFrame()
  root.name = design.name
  root.resize(design.width, design.height)
  root.fills = hexToFills('#FFFFFF')

  async function add(layer: Layer, parent: FrameNode) {
    layerCount++
    let node: SceneNode

    switch (layer.type) {
      case 'frame': {
        const frame = figma.createFrame()
        frame.fills = hexToFills(layer.fill)
        frame.cornerRadius = layer.cornerRadius
        // Match the web editor, which clips a frame's children to its box
        frame.clipsContent = true
        node = frame
        break
      }
      case 'rectangle': {
        const rect = figma.createRectangle()
        rect.fills = hexToFills(layer.fill)
        rect.cornerRadius = layer.cornerRadius
        node = rect
        break
      }
      case 'image': {
        const rect = figma.createRectangle()
        const bytes = dataUriBytes(layer.src)
        rect.fills = bytes
          ? [{ type: 'IMAGE', imageHash: figma.createImage(bytes).hash, scaleMode: 'FILL' }]
          : PLACEHOLDER_FILL
        node = rect
        break
      }
      case 'text': {
        const text = figma.createText()
        // The font must be loaded and set before the characters
        text.fontName = await fonts.get(layer.fontFamily, layer.fontWeight)
        text.fontSize = Math.max(1, layer.fontSize)
        text.characters = layer.text
        text.fills = hexToFills(layer.color)
        text.textAutoResize = autoResize(layer.text, layer.height, layer.fontSize)
        node = text
        break
      }
    }

    node.name = layer.name
    parent.appendChild(node)
    node.x = layer.x
    node.y = layer.y
    // Auto-sized text keeps its natural size; HEIGHT mode needs the width
    if (node.type === 'TEXT') {
      if (node.textAutoResize === 'HEIGHT') node.resize(Math.max(1, layer.width), node.height)
    } else {
      node.resize(Math.max(0.01, layer.width), Math.max(0.01, layer.height))
    }

    if (layer.type === 'frame') {
      for (const child of layer.children) await add(child, node as FrameNode)
    }
  }

  // First layer is the bottom one, so appending in order keeps the stacking
  for (const layer of design.layers) await add(layer, root)

  // Place it in the middle of the current view
  const center = figma.viewport.center
  root.x = Math.round(center.x - design.width / 2)
  root.y = Math.round(center.y - design.height / 2)
  figma.currentPage.appendChild(root)

  return { frame: root, missingFonts: [...fonts.missing], layerCount }
}
