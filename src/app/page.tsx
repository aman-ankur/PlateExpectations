'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function HomePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const { preferences, setMenuImage } = useStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setPreview(base64)
      setMenuImage(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleScan = () => {
    if (!preferences.hasCompletedOnboarding) {
      router.push('/preferences')
    } else {
      router.push('/results')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
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

      {!preview ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mb-6 w-full rounded-full bg-pe-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-pe-accent-hover"
        >
          Choose Photo
        </button>
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
