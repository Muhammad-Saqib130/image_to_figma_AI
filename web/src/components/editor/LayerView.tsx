import type { Layer } from '@framecopy/shared'
import type { CSSProperties } from 'react'

/** Draws one layer (and a frame's children) as an absolutely positioned element */
export function LayerView({ layer }: { layer: Layer }) {
  const box: CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
  }
  // The canvas finds the clicked layer through this attribute
  const common = { 'data-layer-id': layer.id, title: layer.name }

  switch (layer.type) {
    case 'text':
      return (
        <div
          {...common}
          style={{
            ...box,
            // "Inter Variable" is the bundled copy of Inter
            fontFamily: `"${layer.fontFamily}", ${layer.fontFamily === 'Inter' ? '"Inter Variable", ' : ''}ui-sans-serif, system-ui, sans-serif`,
            fontWeight: layer.fontWeight,
            fontSize: layer.fontSize,
            lineHeight: 1.2,
            color: layer.color,
            whiteSpace: 'pre-wrap',
          }}
        >
          {layer.text}
        </div>
      )
    case 'rectangle':
      return <div {...common} style={{ ...box, background: layer.fill, borderRadius: layer.cornerRadius }} />
    case 'image':
      // Images inside screenshots come back as "placeholder:<description>" for now
      return layer.src.startsWith('placeholder:') ? (
        <div
          {...common}
          style={box}
          className="flex items-center justify-center overflow-hidden rounded bg-zinc-300/60 p-1 text-center text-[11px] leading-tight text-zinc-600 outline-1 -outline-offset-1 outline-dashed outline-zinc-400"
        >
          {layer.src.slice('placeholder:'.length)}
        </div>
      ) : (
        <img {...common} src={layer.src} alt={layer.name} draggable={false} style={{ ...box, objectFit: 'cover' }} />
      )
    case 'frame':
      return (
        <div
          {...common}
          style={{ ...box, background: layer.fill, borderRadius: layer.cornerRadius, overflow: 'hidden' }}
        >
          {layer.children.map((child) => (
            <LayerView key={child.id} layer={child} />
          ))}
        </div>
      )
  }
}
