import Link from 'next/link'

export default function DealsNotFound() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl bg-white shadow-lg p-8 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Deal Not Found
          </h1>
          
          <p className="text-slate-600 mb-6">
            The deal you're looking for doesn't exist or has been removed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/deals"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors text-center"
            >
              Browse All Deals
            </Link>
            <Link
              href="/"
              className="flex-1 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors text-center"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
