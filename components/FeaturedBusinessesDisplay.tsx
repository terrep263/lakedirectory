'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function priceToText(priceLevel: unknown, priceRange: unknown): string | null {
  if (typeof priceRange === 'string' && priceRange.trim().length > 0) return priceRange.trim()

  if (typeof priceLevel === 'number' && Number.isFinite(priceLevel)) {
    const n = Math.max(0, Math.min(4, Math.floor(priceLevel)))
    return '$'.repeat(n + 1)
  }

  if (typeof priceLevel === 'string' && priceLevel.trim().length > 0) {
    const s = priceLevel.trim()
    if (/^\d+$/.test(s)) {
      const n = Math.max(0, Math.min(4, Math.floor(Number(s))))
      return '$'.repeat(n + 1)
    }
  }

  return null
}

interface FeaturedBusiness {
  id: string
  name: string
  slug: string | null
  category: string | null
  city: string | null
  state: string | null
  coverUrl: string | null
  logoUrl: string | null
  isVerified: boolean
  ownerId: string | null
  createdAt: string
  aggregateRating: number | null
  totalRatings: number | null
  priceLevel: unknown
  priceRange: unknown
  _count?: { deals?: number }
}

interface FeaturedPage {
  id: string
  slug: string
  title: string
  heroImageUrl: string | null
  locationText: string | null
  business?: FeaturedBusiness | null
}

type Props = {
  fallbackImages?: string[]
}

export default function FeaturedBusinessesDisplay({ fallbackImages }: Props) {
  const [pages, setPages] = useState<FeaturedPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/home/featured?limit=4')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to fetch featured businesses')
        }
        setPages(Array.isArray(data?.pages) ? data.pages : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load featured businesses')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Error loading featured businesses: {error}
      </div>
    )
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Loading featured businesses…</div>
  }

  if (pages.length === 0) {
    return <div className="text-sm text-slate-600">No featured businesses yet.</div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {pages.map((p, idx) => {
        const b = p.business

        const slug = (b?.slug || p.slug || '').trim()
        const href = slug ? `/business/${slug}` : `/business/${p.slug}`

        const heroFromBusiness = (b?.coverUrl || b?.logoUrl || '').trim()
        const heroFromPage = (p.heroImageUrl || '').trim()
        const fallback = Array.isArray(fallbackImages) ? fallbackImages[idx] : null
        const chosen = (heroFromBusiness || heroFromPage || fallback || '').trim()
        const bg = chosen && (chosen.startsWith('http') || chosen.startsWith('/')) ? `url(${chosen})` : null

        const title = (b?.name || p.title || '').trim()
        const cityState =
          (b?.city ? b.city : null) && (b?.state ? b.state : null)
            ? `${b?.city}, ${b?.state}`
            : b?.city
              ? b.city
              : p.locationText

        const isClaimed = Boolean(b?.ownerId)
        const hasDeal = typeof b?._count?.deals === 'number' ? b._count.deals > 0 : false

        const ratingRaw = b?.aggregateRating ?? null
        const rating = typeof ratingRaw === 'number' && ratingRaw > 0 ? ratingRaw : null
        const ratingText = rating ? rating.toFixed(1) : null
        const ratingsCount = b?.totalRatings ?? null

        const priceText = priceToText(b?.priceLevel, b?.priceRange)

        const isNew = (() => {
          const d = b?.createdAt ? new Date(b.createdAt).getTime() : NaN
          if (!Number.isFinite(d)) return false
          const ageDays = (Date.now() - d) / (1000 * 60 * 60 * 24)
          return ageDays <= 30
        })()

        return (
          <Link
            key={p.id}
            href={href}
            className="group relative overflow-hidden rounded-xl bg-slate-200 shadow-md hover:shadow-xl transition-shadow"
          >
            <div
              className="relative h-60 bg-slate-100"
              style={
                bg
                  ? {
                      backgroundImage: bg,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {!bg ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-sky-600">
                  <span className="text-6xl font-extrabold text-white/90">
                    {(title || '?').slice(0, 1).toUpperCase()}
                  </span>
                </div>
              ) : null}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent" />

              {/* Left action stack (visual only) */}
              <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur border border-white/15 shadow">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-white/90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.84 4.61c-1.54-1.4-3.94-1.33-5.4.17L12 8.23 8.56 4.78c-1.46-1.5-3.86-1.57-5.4-.17-1.7 1.55-1.78 4.17-.24 5.82l8.08 8.15a1.5 1.5 0 0 0 2.12 0l8.08-8.15c1.54-1.65 1.46-4.27-.24-5.82Z"
                    />
                  </svg>
                </div>

                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur border border-white/15 shadow">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-white/90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
              </div>

              {/* Top badges */}
              <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white shadow">
                  Featured
                </span>

                {b?.isVerified ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-600/80 px-3 py-1 text-[11px] font-extrabold text-white shadow">
                    Verified
                  </span>
                ) : null}

                {isNew ? (
                  <span className="inline-flex items-center rounded-full bg-sky-500/90 px-3 py-1 text-[11px] font-extrabold text-white shadow">
                    New
                  </span>
                ) : null}

                {hasDeal ? (
                  <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold text-slate-900 shadow">
                    Deal
                  </span>
                ) : null}
              </div>

              {/* Rating pill */}
              {ratingText ? (
                <div className="absolute right-3 top-[92px]">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-blue-600/90 px-3 py-2 text-xs font-extrabold text-white shadow">
                    <span>{ratingText}</span>
                    {typeof ratingsCount === 'number' && ratingsCount > 0 ? (
                      <span className="text-white/85 font-bold">({ratingsCount})</span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 p-4">
                {cityState ? (
                  <div className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm">
                    {cityState}
                  </div>
                ) : null}

                <div className="mt-2 text-lg font-extrabold text-white drop-shadow-sm line-clamp-2">
                  {title}
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {b?.category ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold text-white backdrop-blur">
                          <span className="h-2 w-2 rounded-full bg-emerald-300" />
                          <span className="truncate">{b.category}</span>
                        </span>
                      ) : null}

                      {priceText ? (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white/90">
                          {priceText}
                        </span>
                      ) : null}

                      {typeof ratingsCount === 'number' && ratingsCount > 0 ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white/90">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4 text-white/85"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
                            />
                          </svg>
                          <span>{ratingsCount}</span>
                        </span>
                      ) : null}

                      {isClaimed ? (
                        <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white/90">
                          Claimed
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-xs font-bold text-white/80">View details</div>
                  </div>

                  <span className="inline-flex items-center rounded-md bg-white/15 px-3 py-2 text-[11px] font-extrabold text-white backdrop-blur">
                    View
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
