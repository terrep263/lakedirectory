import Link from 'next/link'

export type PublicFooterProps = {
  countyName?: string
  state?: string
}

export default function PublicFooter({
  countyName = 'Lake County',
  state = 'Florida',
}: PublicFooterProps) {
  return (
    <footer className="mt-12 bg-[#1e3a8a] text-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="text-sm font-bold text-white">Lake County Local</div>
            <p className="mt-3 text-sm text-white/75">
              A community-first directory helping residents discover trusted local
              businesses across {countyName}, {state}.
            </p>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Explore</div>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/businesses" className="text-white/80 hover:text-white">
                Browse businesses
              </Link>
              <Link href="/blog" className="text-white/80 hover:text-white">
                Blog
              </Link>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-white">For businesses</div>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/request-listing" className="text-white/80 hover:text-white">
                Request a listing
              </Link>
              <Link href="/login" className="text-white/80 hover:text-white">
                Vendor login
              </Link>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Newsletter</div>
            <p className="mt-3 text-sm text-white/75">
              Get occasional updates with new listings and local highlights.
            </p>
            <form className="mt-4 flex gap-2">
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="you@example.com"
                disabled
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60"
              />
              <button
                type="button"
                disabled
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Join
              </button>
            </form>
            <p className="mt-2 text-xs text-white/75">Newsletter signup is coming soon.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/75">
          <div>© {new Date().getFullYear()} Lake County Local. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-white" href="#">
              Privacy
            </a>
            <a className="hover:text-white" href="#">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

