import type { Design, Layer } from '@framecopy/shared'
import sharp from 'sharp'

/**
 * Fills each image layer with the matching area cut out of the screenshot,
 * as a data URI. Layers must already be in pixels (see gridToPixels).
 * Areas that fall outside the image, or are too small, keep their placeholder.
 */
export async function extractImages(design: Design, screenshot: Buffer): Promise<Design> {
  const source = sharp(screenshot)
  const { width: imgW = 0, height: imgH = 0, hasAlpha } = await source.metadata()

  const fill = async (layers: Layer[], offsetX: number, offsetY: number): Promise<Layer[]> =>
    Promise.all(
      layers.map(async (layer): Promise<Layer> => {
        const x = offsetX + layer.x
        const y = offsetY + layer.y
        if (layer.type === 'frame') return { ...layer, children: await fill(layer.children, x, y) }
        if (layer.type !== 'image') return layer

        // Clamp to the screenshot
        const left = Math.max(0, Math.round(x))
        const top = Math.max(0, Math.round(y))
        const right = Math.min(imgW, Math.round(x + layer.width))
        const bottom = Math.min(imgH, Math.round(y + layer.height))
        if (right - left < 2 || bottom - top < 2) return layer

        const area = sharp(screenshot).extract({ left, top, width: right - left, height: bottom - top })
        // Keep transparency when the screenshot has it; otherwise JPEG is much smaller
        const [buffer, mime] = hasAlpha
          ? [await area.png().toBuffer(), 'image/png']
          : [await area.jpeg({ quality: 88 }).toBuffer(), 'image/jpeg']
        return { ...layer, src: `data:${mime};base64,${buffer.toString('base64')}` }
      }),
    )

  return { ...design, layers: await fill(design.layers, 0, 0) }
}
