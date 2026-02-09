export default function DealsLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-sky-600" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="h-4 w-48 bg-white/20 rounded animate-pulse mb-6" />
            <div className="h-12 w-96 bg-white/30 rounded animate-pulse mb-4" />
            <div className="h-6 w-full max-w-2xl bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-9 w-24 bg-slate-200 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <main className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl bg-white shadow-md overflow-hidden">
                <div className="h-48 bg-slate-200 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                  <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
