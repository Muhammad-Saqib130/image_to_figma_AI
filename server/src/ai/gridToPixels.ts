import type { Design, Layer } from '@framecopy/shared'
import { GRID } from './prompt.js'

/**
 * Converts a design measured on the 0–GRID grid into real pixels of the screenshot.
 * x/width scale with the image width and y/height with its height; fontSize and
 * cornerRadius are already in pixels.
 *
 * If the model answered in pixels anyway (design width/height equal the image size
 * instead of GRID), only the design size is set and nothing is scaled.
 */
export function gridToPixels(design: Design, imageWidth: number, imageHeight: number): Design {
  const answeredInPixels =
    design.width === imageWidth && design.height === imageHeight && (imageWidth !== GRID || imageHeight !== GRID)
  if (answeredInPixels) return design

  const sx = imageWidth / GRID
  const sy = imageHeight / GRID
  const scale = (layer: Layer): Layer => {
    const scaled = {
      ...layer,
      x: Math.round(layer.x * sx),
      y: Math.round(layer.y * sy),
      width: Math.round(layer.width * sx),
      height: Math.round(layer.height * sy),
    }
    return scaled.type === 'frame' ? { ...scaled, children: scaled.children.map(scale) } : scaled
  }

  return { ...design, width: imageWidth, height: imageHeight, layers: design.layers.map(scale) }
}
