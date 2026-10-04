import type { Design, Layer } from '@framecopy/shared'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/** Read-only rendering of a design's layers, scaled to fit its container width */
export function DesignPreview({ design }: { design: Design }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  // Keep the scale in sync with the container's width
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / design.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [design.width])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-white/10"
      style={{ aspectRatio: `${design.width} / ${design.height}` }}
    >
      {/* Draw at full size, then scale down to the container width */}
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: design.width, height: design.height, transform: `scale(${scale})` }}
      >
        {design.layers.map((layer) => (
          <LayerView key={layer.id} layer={layer} />
        ))}
      </div>
    </div>
  )
}

function LayerView({ layer }: { layer: Layer }) {
  const box: CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
  }

  switch (layer.type) {
    case 'text':
      return (
        <div
          title={layer.name}
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
      return <div title={layer.name} style={{ ...box, background: layer.fill, borderRadius: layer.cornerRadius }} />
    case 'image':
      // Images inside screenshots come back as "placeholder:<description>" for now
      return layer.src.startsWith('placeholder:') ? (
        <div
          title={layer.name}
          style={box}
          className="flex items-center justify-center overflow-hidden rounded bg-zinc-300/60 p-1 text-center text-[11px] leading-tight text-zinc-600 outline-1 -outline-offset-1 outline-dashed outline-zinc-400"
        >
          {layer.src.slice('placeholder:'.length)}
        </div>
      ) : (
        <img src={layer.src} alt={layer.name} style={{ ...box, objectFit: 'cover' }} />
      )
    case 'frame':
      return (
        <div
          title={layer.name}
          style={{ ...box, background: layer.fill, borderRadius: layer.cornerRadius, overflow: 'hidden' }}
        >
          {layer.children.map((child) => (
            <LayerView key={child.id} layer={child} />
          ))}
        </div>
      )
  }
}
