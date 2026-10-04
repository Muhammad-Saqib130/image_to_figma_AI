/** Inter ships with Figma, so it is always available */
const FALLBACK_FAMILY = 'Inter'

// Order matters: "semibold" and "extrabold" must be checked before "bold"
const STYLE_WEIGHTS: [RegExp, number][] = [
  [/thin|hairline/, 100],
  [/extra ?light|ultra ?light/, 200],
  [/light/, 300],
  [/semi ?bold|demi ?bold/, 600],
  [/extra ?bold|ultra ?bold/, 800],
  [/black|heavy/, 900],
  [/bold/, 700],
  [/medium/, 500],
  [/regular|normal|book|roman/, 400],
]

/** "Semi Bold" -> 600; italic styles are skipped (null) */
export function styleWeight(style: string): number | null {
  const s = style.toLowerCase()
  if (s.includes('italic') || s.includes('oblique')) return null
  for (const [pattern, weight] of STYLE_WEIGHTS) if (pattern.test(s)) return weight
  return null
}

type Family = { name: string; styles: { style: string; weight: number }[] }

/**
 * Picks real Figma fonts for the design's family/weight pairs.
 * Uses the closest available upright style; unknown families fall back to Inter.
 */
export class FontPicker {
  /** Keyed by lower-case family name */
  private families = new Map<string, Family>()
  private loaded = new Set<string>()
  /** Families the design asked for that Figma doesn't have */
  readonly missing = new Set<string>()

  static async create(): Promise<FontPicker> {
    const picker = new FontPicker()
    for (const { fontName } of await figma.listAvailableFontsAsync()) {
      const weight = styleWeight(fontName.style)
      if (weight === null) continue
      const key = fontName.family.toLowerCase()
      if (!picker.families.has(key)) picker.families.set(key, { name: fontName.family, styles: [] })
      picker.families.get(key)!.styles.push({ style: fontName.style, weight })
    }
    return picker
  }

  private closest(family: string, weight: number): FontName | null {
    const found = this.families.get(family.trim().toLowerCase())
    if (!found?.styles.length) return null
    const best = found.styles.reduce((a, b) => (Math.abs(b.weight - weight) < Math.abs(a.weight - weight) ? b : a))
    return { family: found.name, style: best.style }
  }

  /** Returns a loaded font for this family and weight */
  async get(family: string, weight: number): Promise<FontName> {
    let font = this.closest(family, weight)
    if (!font) {
      this.missing.add(family)
      font = this.closest(FALLBACK_FAMILY, weight) ?? { family: FALLBACK_FAMILY, style: 'Regular' }
    }
    const key = `${font.family}::${font.style}`
    if (!this.loaded.has(key)) {
      await figma.loadFontAsync(font)
      this.loaded.add(key)
    }
    return font
  }
}
