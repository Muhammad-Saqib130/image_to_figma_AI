import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { UploadPanel, type ConvertStatus } from '../components/UploadPanel'
import { ConvertError, convertImage } from '../lib/convertImage'
import { projectNameFromFile, saveProject } from '../lib/designStore'

const headerStatus: Record<ConvertStatus, string> = {
  idle: 'Ready to transform',
  uploading: 'Uploading',
  recreating: 'Recreating',
}

export function HomePage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<ConvertStatus>('idle')
  const [uploadPercent, setUploadPercent] = useState(0)
  const [convertError, setConvertError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Stop an in-flight request if the user leaves the page
  useEffect(() => () => abortRef.current?.abort(), [])

  function handleFileChange(next: File | null) {
    setFile(next)
    setConvertError(null)
  }

  async function handleConvert() {
    if (!file || status !== 'idle') return
    const controller = new AbortController()
    abortRef.current = controller

    setConvertError(null)
    setUploadPercent(0)
    setStatus('uploading')
    try {
      const design = await convertImage(file, {
        signal: controller.signal,
        onUploadProgress: setUploadPercent,
        onUploaded: () => setStatus('recreating'),
      })
      const project = { name: projectNameFromFile(file.name), design }
      saveProject(project)
      navigate('/editor', { state: { project } })
    } catch (err) {
      if (controller.signal.aborted) return
      setConvertError(
        err instanceof ConvertError ? err.message : 'Something went wrong. Please try again.',
      )
      setStatus('idle')
    }
  }

  return (
    <div className="bg-grid min-h-screen overflow-x-hidden bg-[#050506] font-sans antialiased">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-8 lg:px-12">
        <Header status={status === 'idle' && file ? 'Image ready' : headerStatus[status]} />
        <main className="grid flex-1 grid-cols-1 items-center gap-12 *:min-w-0 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16">
          <Hero />
          <UploadPanel
            file={file}
            onFileChange={handleFileChange}
            status={status}
            uploadPercent={uploadPercent}
            convertError={convertError}
            onConvert={handleConvert}
          />
        </main>
      </div>
    </div>
  )
}
