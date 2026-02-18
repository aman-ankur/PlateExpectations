'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { compressImage } from '@/lib/compress'

export default function HomePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { preferences, setMenuImage } = useStore()

  useEffect(() => setMounted(true), [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const base64 = await compressImage(file)
      setPreview(base64)
      setMenuImage(base64)
    } catch {
      // Fallback to raw read if compression fails
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setPreview(base64)
        setMenuImage(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleScan = () => {
    if (!preferences.hasCompletedOnboarding) {
      router.push('/preferences')
    } else {
      router.push('/results')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Settings gear */}
      {mounted && preferences.hasCompletedOnboarding && (
        <button
          onClick={() => router.push('/settings')}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-pe-surface"
        >
          <svg className="h-5 w-5 text-pe-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
      <h1 className="mb-2 text-3xl font-bold text-pe-text">
        Plate Expectations
      </h1>
      <p className="mb-10 text-pe-text-secondary">
        Decode any menu, anywhere
      </p>

      <div
        className="mb-6 flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pe-border p-10 transition-colors hover:border-pe-accent"
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img
            src={preview}
            alt="Menu preview"
            className="max-h-64 rounded-lg object-contain"
          />
        ) : (
          <>
            <svg
              className="mb-4 h-16 w-16 text-pe-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            <h2 className="mb-1 text-lg font-semibold text-pe-text">
              Scan a menu
            </h2>
            <p className="text-sm text-pe-text-secondary">
              Upload a photo of any foreign menu
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <div className="mb-6 grid w-full grid-cols-2 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-full bg-pe-accent px-5 py-3.5 font-semibold text-white transition-colors hover:bg-pe-accent-hover"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Take Photo
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-full border border-pe-border px-5 py-3.5 font-semibold text-pe-text transition-colors hover:bg-pe-surface"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            Gallery
          </button>
        </div>
      ) : (
        <button
          onClick={handleScan}
          className="mb-6 w-full rounded-full bg-pe-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-pe-accent-hover"
        >
          Analyze Menu
        </button>
      )}

      <p className="text-center text-xs text-pe-text-muted">
        Point your camera at any menu in a foreign language.
        <br />
        We&apos;ll identify each dish for you.
      </p>
    </div>
  )
}
