import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Canvas } from '../components/editor/Canvas'
import { Toolbar } from '../components/editor/Toolbar'
import { TOOLS, type Tool } from '../components/editor/tools'
import { TopBar } from '../components/editor/TopBar'
import { loadProject, type Project } from '../lib/designStore'

export function EditorPage() {
  const location = useLocation()
  // Prefer the project passed from the home page; fall back to the saved copy after a refresh
  const [project] = useState<Project | null>(
    () => (location.state as { project?: Project } | null)?.project ?? loadProject(),
  )
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Tool shortcuts: V, F, T, I, R
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const match = TOOLS.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase())
      if (match) setTool(match.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050506] px-4 text-center font-sans text-zinc-200 antialiased">
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
      </div>
    )
  }

  function handleExport() {
    if (!project) return
    const blob = new Blob([JSON.stringify(project.design, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black font-sans text-zinc-200 antialiased">
      <TopBar
        projectName={project.name}
        onExport={handleExport}
        onCopyToFigma={() => setToast('Copy to Figma is coming soon.')}
      />
      <div className="flex min-h-0 flex-1">
        <Toolbar tool={tool} onToolChange={setTool} />
        <Canvas design={project.design} tool={tool} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {toast && (
        <p
          role="status"
          className="fixed top-20 right-4 z-10 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-xl sm:top-24 sm:right-5"
        >
          {toast}
        </p>
      )}
    </div>
  )
}
