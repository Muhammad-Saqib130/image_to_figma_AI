import { Link } from 'react-router'
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, CopyIcon, DownloadIcon, LayersIcon } from '../icons'

type TopBarProps = {
  projectName: string
  onExport: () => void
  onCopyToFigma: () => void
}

export function TopBar({ projectName, onExport, onCopyToFigma }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 bg-black px-3 sm:h-[4.5rem] sm:gap-4 sm:px-5">
      <Link
        to="/"
        aria-label="Back to upload"
        title="Back"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-zinc-300 transition hover:bg-white/10 hover:text-white"
      >
        <ArrowLeftIcon className="size-5" />
      </Link>

      <Link to="/" className="flex shrink-0 items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-white text-zinc-900 shadow-[0_0_24px_rgb(59_130_246/0.3)] sm:size-10">
          <LayersIcon className="size-5" />
        </span>
        <span className="hidden text-lg font-semibold tracking-tight text-white md:inline sm:text-xl">FrameCopy</span>
      </Link>

      <span className="hidden h-6 w-px bg-white/15 md:block" aria-hidden="true" />

      <p className="flex min-w-0 items-center gap-1.5 text-zinc-200" title={projectName}>
        <span className="truncate">{projectName}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-zinc-500" />
      </p>

      <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-lime-400/10 px-3 py-1 text-sm text-lime-300 ring-1 ring-lime-400/20 lg:flex">
        <CheckIcon className="size-3.5" />
        Layers ready
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onExport}
          title="Download the design as JSON"
          className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-zinc-100 transition hover:bg-white/5 sm:px-4"
        >
          <DownloadIcon className="size-5" />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          type="button"
          onClick={onCopyToFigma}
          className="flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2.5 font-medium text-white shadow-[0_6px_24px_rgb(59_130_246/0.35)] transition hover:bg-blue-400 sm:px-4"
        >
          <CopyIcon className="size-5" />
          <span className="hidden sm:inline">Copy to Figma</span>
          <span className="sm:hidden">Copy</span>
        </button>
      </div>
    </header>
  )
}
