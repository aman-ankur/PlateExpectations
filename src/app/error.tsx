'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h2 className="mb-2 text-xl font-bold text-pe-text">Something went wrong</h2>
      <p className="mb-6 text-sm text-pe-text-secondary">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-full bg-pe-accent px-6 py-2.5 font-semibold text-white"
      >
        Try Again
      </button>
    </div>
  )
}
