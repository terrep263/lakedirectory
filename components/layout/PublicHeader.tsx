import Link from 'next/link'

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-[#1e3a8a] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="https://019bb44e-0d7e-7695-9ab5-ee7e0fcf0839.mochausercontent.com/LAKELOCAL.png"
                alt="Lake County Local"
                className="h-10 w-auto"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link href="/" className="px-3 py-2 text-sm font-semibold text-white/90 hover:text-white">
                Home
              </Link>
              <Link
                href="/businesses"
                className="px-3 py-2 text-sm font-semibold text-white/90 hover:text-white"
              >
                Businesses
              </Link>
              <Link href="/blog" className="px-3 py-2 text-sm font-semibold text-white/90 hover:text-white">
                Blog
              </Link>
              <Link href="/login" className="px-3 py-2 text-sm font-semibold text-white/90 hover:text-white">
                Vendor Login
              </Link>
              <Link
                href="/request-listing"
                className="ml-2 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
              >
                Request Listing
              </Link>
            </nav>

            <div className="md:hidden flex items-center gap-2">
              <Link
                href="/request-listing"
                className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-500"
              >
                Request
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

