/** "#RGB", "#RRGGBB" or "#RRGGBBAA" -> a Figma solid fill (or none when fully transparent) */
export function hexToFills(hex: string): Paint[] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255
  const opacity = h.length === 8 ? n(6) : 1
  if (opacity === 0) return []
  return [{ type: 'SOLID', color: { r: n(0), g: n(2), b: n(4) }, opacity }]
}
