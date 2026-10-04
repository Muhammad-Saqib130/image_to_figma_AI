import type { Design } from '@framecopy/shared'
import { useCallback, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { FitIcon, FrameIcon, ZoomInIcon, ZoomOutIcon } from '../icons'
import { findLayerRect, type Rect } from './layerTree'
import { LayerView } from './LayerView'
import type { Tool } from './tools'

const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4]
const MIN_ZOOM = ZOOM_STEPS[0]
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]
/** Space around the frame in screen pixels; the bottom leaves room for the zoom controls */
function paddingFor(canvasWidth: number) {
  return canvasWidth < 640
    ? { top: 48, right: 16, bottom: 96, left: 16 }
    : { top: 64, right: 64, bottom: 112, left: 64 }
}

type CanvasProps = {
  design: Design
  tool: Tool
  selectedId: string | null
  onSelect: (id: string) => void
}

export function Canvas({ design, tool, selectedId, onSelect }: CanvasProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [padding, setPadding] = useState(() => paddingFor(1024))
  // Point of the design (in design pixels) to keep at the centre of the view after a zoom
  const anchorRef = useRef<{ x: number; y: number } | null>(null)

  const fitZoom = useCallback(
    (el: HTMLElement) => {
      const pad = paddingFor(el.clientWidth)
      const fit = Math.min(
        (el.clientWidth - pad.left - pad.right) / design.width,
        (el.clientHeight - pad.top - pad.bottom) / design.height,
        1,
      )
      return Math.max(MIN_ZOOM, fit)
    },
    [design.width, design.height],
  )

  // Start zoomed so the whole design fits, as soon as the canvas can be measured
  const attachScroll = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el
      if (!el) return
      setPadding(paddingFor(el.clientWidth))
      setZoom((z) => z ?? fitZoom(el))
    },
    [fitZoom],
  )

  // After a zoom, scroll so the anchored point stays in the middle of the view
  useLayoutEffect(() => {
    const el = scrollRef.current
    const frame = frameRef.current
    const anchor = anchorRef.current
    if (!el || !frame || !anchor || zoom === null) return
    anchorRef.current = null
    el.scrollLeft = frame.offsetLeft + anchor.x * zoom - el.clientWidth / 2
    el.scrollTop = frame.offsetTop + anchor.y * zoom - el.clientHeight / 2
  }, [zoom])

  function zoomTo(next: number) {
    const el = scrollRef.current
    const frame = frameRef.current
    if (el && frame && zoom) {
      anchorRef.current = {
        x: (el.scrollLeft + el.clientWidth / 2 - frame.offsetLeft) / zoom,
        y: (el.scrollTop + el.clientHeight / 2 - frame.offsetTop) / zoom,
      }
    }
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)))
  }

  const current = zoom ?? 1
  // Compare shown percentages, so e.g. a fit of 74.98% steps to 100%, not to 75%
  const percent = (z: number) => Math.round(z * 100)
  const zoomIn = () => zoomTo(ZOOM_STEPS.find((z) => percent(z) > percent(current)) ?? MAX_ZOOM)
  const zoomOut = () => zoomTo([...ZOOM_STEPS].reverse().find((z) => percent(z) < percent(current)) ?? MIN_ZOOM)
  const fit = () => {
    const el = scrollRef.current
    if (!el) return
    anchorRef.current = { x: design.width / 2, y: design.height / 2 }
    setPadding(paddingFor(el.clientWidth))
    setZoom(fitZoom(el))
  }

  // The deepest layer under the pointer, found via data-layer-id
  const layerIdAt = (e: MouseEvent) =>
    (e.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')?.dataset.layerId ?? null

  const selectedRect = selectedId ? findLayerRect(design.layers, selectedId) : null
  const hoveredRect =
    tool === 'select' && hoveredId && hoveredId !== selectedId ? findLayerRect(design.layers, hoveredId) : null

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={attachScroll}
        className="absolute inset-0 overflow-auto bg-[#050506]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.22) 1.2px, transparent 1.4px)',
          backgroundSize: '24px 24px',
          backgroundAttachment: 'local',
        }}
      >
        {zoom !== null && (
          <div className="grid min-h-full min-w-full place-items-center" style={{
              width: 'max-content',
              padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
            }}>
            <div
              ref={frameRef}
              className="relative"
              style={{ width: design.width * zoom, height: design.height * zoom }}
            >
              <p className="absolute -top-7 left-0 flex items-center gap-1.5 text-sm whitespace-nowrap text-zinc-400 select-none">
                <FrameIcon className="size-3.5" />
                {design.name} · {design.width} × {design.height}
              </p>

              {/* Layers are drawn at real size and scaled, so their numbers match the JSON */}
              <div
                className={`absolute top-0 left-0 origin-top-left overflow-hidden bg-white shadow-[0_20px_60px_rgb(0_0_0/0.5)] select-none ${
                  tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
                }`}
                style={{ width: design.width, height: design.height, transform: `scale(${zoom})` }}
                onClick={(e) => {
                  if (tool !== 'select') return
                  const id = layerIdAt(e)
                  if (id) onSelect(id)
                }}
                onMouseMove={(e) => setHoveredId(layerIdAt(e))}
                onMouseLeave={() => setHoveredId(null)}
              >
                {design.layers.map((layer) => (
                  <LayerView key={layer.id} layer={layer} />
                ))}
              </div>

              {/* Outlines are drawn outside the scaled layer so they stay crisp at any zoom */}
              {hoveredRect && <Outline rect={hoveredRect} zoom={zoom} className="border-blue-400/60" />}
              {selectedRect && <Outline rect={selectedRect} zoom={zoom} className="border-blue-500" />}
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-zinc-950/90 p-1.5 shadow-xl backdrop-blur">
          <ZoomButton label="Zoom out" onClick={zoomOut} disabled={percent(current) <= percent(MIN_ZOOM)}>
            <ZoomOutIcon className="size-5" />
          </ZoomButton>
          <span className="w-14 text-center text-sm text-zinc-300 tabular-nums" aria-live="polite">
            {percent(current)}%
          </span>
          <ZoomButton label="Zoom in" onClick={zoomIn} disabled={percent(current) >= percent(MAX_ZOOM)}>
            <ZoomInIcon className="size-5" />
          </ZoomButton>
          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
          <ZoomButton label="Zoom to fit" onClick={fit}>
            <FitIcon className="size-5" />
          </ZoomButton>
        </div>
      </div>
    </div>
  )
}

function Outline({ rect, zoom, className }: { rect: Rect; zoom: number; className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute border-[1.5px] ${className}`}
      style={{
        left: rect.x * zoom,
        top: rect.y * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom,
      }}
    />
  )
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-xl text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
