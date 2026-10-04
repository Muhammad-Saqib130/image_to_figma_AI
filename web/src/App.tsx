import { useState } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { UploadPanel } from './components/UploadPanel'

function App() {
  const [file, setFile] = useState<File | null>(null)

  return (
    <div className="bg-grid min-h-screen overflow-x-hidden bg-[#050506] font-sans antialiased">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-8 lg:px-12">
        <Header hasImage={file !== null} />
        <main className="grid flex-1 grid-cols-1 items-center gap-12 *:min-w-0 py-12 lg:grid-cols-2 lg:gap-16 lg:py-16">
          <Hero />
          <UploadPanel file={file} onFileChange={setFile} />
        </main>
      </div>
    </div>
  )
}

export default App
