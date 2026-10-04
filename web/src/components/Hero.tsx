const steps = [
  { label: 'Upload', color: 'bg-blue-500 text-white' },
  { label: 'Recreate', color: 'bg-red-500 text-white' },
  { label: 'Edit & copy', color: 'bg-lime-300 text-zinc-900' },
]

export function Hero() {
  return (
    <section className="flex flex-col justify-center">
      <p className="flex items-center gap-4 text-xs font-medium tracking-[0.12em] text-zinc-400 uppercase sm:text-sm">
        <span className="h-px w-10 bg-zinc-600" aria-hidden="true" />
        Screenshot to editable layers
      </p>

      <h1 className="mt-6 text-5xl leading-[1.02] font-semibold tracking-tight text-white sm:text-6xl lg:mt-8 lg:text-7xl xl:text-[5.25rem]">
        Turn any screenshot into an editable design
      </h1>

      <p className="mt-6 max-w-xl text-lg leading-relaxed font-light text-zinc-400 sm:text-xl lg:mt-8">
        Upload a website or app screenshot and recreate its design as editable layers.
      </p>

      <ol className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-zinc-300 sm:text-base lg:mt-12">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-4">
            <span className="flex items-center gap-2.5">
              <span
                className={`grid size-6 place-items-center rounded-full text-xs font-medium ${step.color}`}
              >
                {i + 1}
              </span>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-zinc-600" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
