import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { ACCEPTED_IMAGE_TYPES, formatBytes, validateImage } from '../lib/validateImage'
import { AlertIcon, CloudUploadIcon, PlusIcon, SparklesIcon, XIcon } from './icons'

type UploadPanelProps = {
  file: File | null
  onFileChange: (file: File | null) => void
}

export function UploadPanel({ file, onFileChange }: UploadPanelProps) {
  const inputId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Release the last preview URL when the panel unmounts
  const previewUrlRef = useRef<string | null>(null)
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  function select(next: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = next ? URL.createObjectURL(next) : null
    previewUrlRef.current = url
    setPreviewUrl(url)
    onFileChange(next)
  }

  function handleFiles(files: FileList | null) {
    const picked = files?.[0]
    if (!picked) return
    if (files.length > 1) {
      setError('Please choose just one image at a time.')
      return
    }
    const message = validateImage(picked)
    setError(message)
    // Keep the previous valid image if the new one is rejected
    if (!message) select(picked)
  }

  function clear() {
    select(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDragging(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <section className="relative" aria-label="Upload a screenshot">
      {/* Coloured glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_50%_at_10%_20%,rgb(234_179_8/0.28),transparent),radial-gradient(50%_45%_at_20%_95%,rgb(239_68_68/0.3),transparent),radial-gradient(60%_60%_at_95%_70%,rgb(59_130_246/0.32),transparent)] blur-2xl"
      />

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex h-80 flex-col overflow-hidden rounded-3xl border bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-slate-950/95 backdrop-blur transition-colors sm:aspect-[7/5] sm:h-auto ${
          isDragging
            ? 'border-blue-400/70 ring-4 ring-blue-500/20'
            : error
              ? 'border-red-500/50'
              : 'border-white/10'
        }`}
      >
        {file && previewUrl ? (
          <div className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1 p-4 sm:p-6">
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="h-full w-full rounded-xl object-contain"
              />
              <button
                type="button"
                onClick={clear}
                className="absolute top-6 right-6 grid size-9 place-items-center rounded-full bg-black/70 text-zinc-200 ring-1 ring-white/15 backdrop-blur transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400 sm:top-8 sm:right-8"
                aria-label="Remove image"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm sm:px-6">
              <p className="min-w-0 truncate text-zinc-300" title={file.name}>
                {file.name}
                <span className="ml-2 text-zinc-500">{formatBytes(file.size)}</span>
              </p>
              <label
                htmlFor={inputId}
                className="shrink-0 cursor-pointer text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                Replace
              </label>
            </div>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="flex h-full cursor-pointer flex-col items-center justify-center px-6 text-center"
          >
            <span className="relative grid size-20 place-items-center rounded-full border border-white/10 bg-zinc-800/60 text-zinc-200 sm:size-24">
              <CloudUploadIcon className="size-7 sm:size-8" />
              <span className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-white text-zinc-900 shadow-lg sm:size-9">
                <PlusIcon className="size-4" />
              </span>
            </span>
            <span className="mt-6 text-xl font-medium text-white sm:text-2xl">
              {isDragging ? 'Release to upload' : 'Drop your image here'}
            </span>
            <span className="mt-2 text-zinc-400">
              or{' '}
              <span className="font-medium text-white underline decoration-white/40 underline-offset-4">
                choose an image
              </span>
            </span>
            <span className="mt-6 text-sm text-zinc-500">PNG, JPG or WEBP · up to 20 MB</span>
          </label>
        )}

        {isDragging && file && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-zinc-950/80 text-xl font-medium text-white">
            Release to replace
          </div>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0 text-red-400" />
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!file}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5 text-lg font-medium text-white shadow-[0_10px_40px_rgb(37_99_235/0.35)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:from-blue-900/70 disabled:to-blue-800/70 disabled:text-white/60 disabled:shadow-none disabled:hover:brightness-100"
      >
        <SparklesIcon className="size-5" />
        Convert to Design
      </button>

      <p className="mt-5 flex items-center justify-center gap-2 text-sm text-zinc-400">
        <SparklesIcon className="size-4 text-lime-300" />
        Every element becomes an editable layer
      </p>
    </section>
  )
}
