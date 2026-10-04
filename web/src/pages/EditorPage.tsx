import type { Design, Layer } from '@framecopy/shared'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { DesignPreview } from '../components/DesignPreview'
import { LayersIcon } from '../components/icons'
import { loadDesign } from '../lib/designStore'

function countLayers(layers: Layer[]): number {
  return layers.reduce((n, l) => n + 1 + (l.type === 'frame' ? countLayers(l.children) : 0), 0)
}

export function EditorPage() {
  const location = useLocation()
  // Prefer the design passed from the home page; fall back to the saved copy after a refresh
  const [design] = useState<Design | null>(
    () => (location.state as { design?: Design } | null)?.design ?? loadDesign(),
  )
  const [showJson, setShowJson] = useState(false)

  return (
    <div className="bg-grid min-h-screen bg-[#050506] font-sans text-zinc-200 antialiased">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-zinc-900">
              <LayersIcon className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-white">FrameCopy</span>
          </Link>
          <Link to="/" className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline">
            ← New screenshot
          </Link>
        </header>

        {design ? (
          <main className="py-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-white">Editor</h1>
                <p className="mt-1 text-zinc-400">
                  {design.name} · {design.width} × {design.height} · {countLayers(design.layers)} layers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/5"
                aria-expanded={showJson}
              >
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </button>
            </div>

            <div className="mt-6">
              <DesignPreview design={design} />
            </div>

            {showJson && (
              <pre className="mt-6 max-h-[32rem] overflow-auto rounded-xl border border-white/10 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-300">
                {JSON.stringify(design, null, 2)}
              </pre>
            )}
          </main>
        ) : (
          <main className="grid min-h-[60vh] place-items-center text-center">
            <div>
              <h1 className="text-2xl font-semibold text-white">No design yet</h1>
              <p className="mt-2 text-zinc-400">Upload a screenshot first, then click Convert to Design.</p>
              <Link
                to="/"
                className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500"
              >
                Upload a screenshot
              </Link>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
