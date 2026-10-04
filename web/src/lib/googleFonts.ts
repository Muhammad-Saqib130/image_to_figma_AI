import type { Layer } from '@framecopy/shared'
import { useEffect } from 'react'

/** Fonts that are installed on most computers or bundled with the app; never requested */
const LOCAL_FONTS = new Set(
  [
    'inter', // bundled (@fontsource-variable/inter)
    'outfit', // bundled
    'arial',
    'helvetica',
    'helvetica neue',
    'times new roman',
    'times',
    'georgia',
    'verdana',
    'tahoma',
    'trebuchet ms',
    'segoe ui',
    'courier new',
    'system-ui',
    'sans-serif',
    'serif',
    'monospace',
  ].map((f) => f.toLowerCase()),
)

/** Every font family used by text layers, with the weights it is used at */
export function collectFonts(layers: Layer[], fonts = new Map<string, Set<number>>()) {
  for (const layer of layers) {
    if (layer.type === 'text') {
      const family = layer.fontFamily.trim()
      if (family && !LOCAL_FONTS.has(family.toLowerCase())) {
        // Google Fonts only serves weights in steps of 100
        const weight = Math.min(900, Math.max(100, Math.round(layer.fontWeight / 100) * 100))
        if (!fonts.has(family)) fonts.set(family, new Set())
        fonts.get(family)!.add(weight)
      }
    } else if (layer.type === 'frame') {
      collectFonts(layer.children, fonts)
    }
  }
  return fonts
}

/**
 * Stylesheet URLs to load. Google rejects a whole request if the family doesn't
 * exist or lacks one of the weights, so each family + weight gets its own URL,
 * plus the family's regular style as a backup.
 */
export function googleFontUrls(fonts: Map<string, Set<number>>): string[] {
  const urls: string[] = []
  for (const [family, weights] of fonts) {
    const name = encodeURIComponent(family).replace(/%20/g, '+')
    urls.push(`https://fonts.googleapis.com/css2?family=${name}&display=swap`)
    for (const weight of [...weights].sort()) {
      if (weight !== 400) urls.push(`https://fonts.googleapis.com/css2?family=${name}:wght@${weight}&display=swap`)
    }
  }
  return urls
}

/** Adds <link> tags for the design's fonts (once each; they stay for later designs too) */
export function useGoogleFonts(layers: Layer[]) {
  useEffect(() => {
    for (const href of googleFontUrls(collectFonts(layers))) {
      if (document.head.querySelector(`link[data-google-font="${CSS.escape(href)}"]`)) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.googleFont = href
      document.head.appendChild(link)
    }
  }, [layers])
}
