import { TOOLS, type Tool } from './tools'

type ToolbarProps = {
  tool: Tool
  onToolChange: (tool: Tool) => void
}

export function Toolbar({ tool, onToolChange }: ToolbarProps) {
  return (
    <nav
      aria-label="Tools"
      className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-black py-3 sm:w-[4.5rem] sm:py-4"
    >
      {TOOLS.map(({ id, label, shortcut, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onToolChange(id)}
          aria-pressed={tool === id}
          aria-label={`${label} (${shortcut})`}
          title={`${label} (${shortcut})`}
          className={`grid size-10 place-items-center rounded-xl transition sm:size-11 ${
            tool === id
              ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/25'
              : 'text-zinc-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon className="size-5" />
        </button>
      ))}
    </nav>
  )
}
