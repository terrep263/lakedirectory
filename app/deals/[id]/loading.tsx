export default function DealDetailLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      {/* Breadcrumbs Skeleton */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      <main className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2">
              <div className="rounded-xl bg-white shadow-lg overflow-hidden">
                {/* Image Skeleton */}
                <div className="h-80 bg-slate-200 animate-pulse" />

                {/* Content Skeleton */}
                <div className="p-8 space-y-6">
                  <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse" />
                  <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                  
                  <div className="p-6 rounded-xl bg-slate-100">
                    <div className="h-12 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                  </div>

                  <div className="h-12 w-full bg-slate-200 rounded-xl animate-pulse" />

                  <div className="space-y-3">
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                <div className="rounded-xl bg-white shadow-lg p-6">
                  <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-4" />
                  <div className="space-y-4">
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
