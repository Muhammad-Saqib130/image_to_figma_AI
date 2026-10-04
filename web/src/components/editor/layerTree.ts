import type { Layer } from '@framecopy/shared'

export type Rect = { x: number; y: number; width: number; height: number }

/** Finds a layer by id and returns its position relative to the design (not its parent frame) */
export function findLayerRect(layers: Layer[], id: string, offsetX = 0, offsetY = 0): Rect | null {
  for (const layer of layers) {
    const x = offsetX + layer.x
    const y = offsetY + layer.y
    if (layer.id === id) return { x, y, width: layer.width, height: layer.height }
    if (layer.type === 'frame') {
      const found = findLayerRect(layer.children, id, x, y)
      if (found) return found
    }
  }
  return null
}
