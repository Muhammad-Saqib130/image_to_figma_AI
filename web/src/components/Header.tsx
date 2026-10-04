import { LayersIcon } from './icons'

type HeaderProps = {
  hasImage: boolean
}

export function Header({ hasImage }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <a href="/" className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-white text-zinc-900 shadow-[0_0_32px_rgb(59_130_246/0.35)]">
          <LayersIcon className="size-5" />
        </span>
        <span className="text-xl font-semibold tracking-tight text-white">FrameCopy</span>
      </a>

      <p className="flex items-center gap-2 text-xs text-zinc-400 sm:text-sm" role="status">
        <span className="size-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgb(163_230_53/0.8)]" />
        {hasImage ? 'Image ready' : 'Ready to transform'}
      </p>
    </header>
  )
}
