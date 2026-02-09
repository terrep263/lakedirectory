'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DealDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Deal detail error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f6f8fb] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl bg-white shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Deal Unavailable
          </h2>
          
          <p className="text-slate-600 mb-6">
            We couldn't load this deal. It may have expired or been removed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/deals"
              className="flex-1 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors text-center"
            >
              Browse Deals
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
