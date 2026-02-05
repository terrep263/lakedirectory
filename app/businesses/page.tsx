/**
 * Businesses Directory Page - Using Authoritative Layout from lcl.zip
 *
 * Layout primitives:
 * - Container: max-w-7xl (1280px) for wider content areas
 * - Section padding: py-8
 * - Grid: md:grid-cols-2 gap-6 for business cards
 * - Filter sidebar: lg:col-span-1 with sticky positioning
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import AdminQuickNav from '@/components/layout/AdminQuickNav';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'Business Directory | Lake County Local',
  description: 'Browse local businesses in Lake County, Florida. Find trusted services, restaurants, and shops.',
};

function priceToText(priceLevel: unknown, priceRange: unknown): string | null {
  if (typeof priceRange === 'string' && priceRange.trim().length > 0) return priceRange.trim();

  if (typeof priceLevel === 'number' && Number.isFinite(priceLevel)) {
    const n = Math.max(0, Math.min(4, Math.floor(priceLevel)));
    return '$'.repeat(n + 1);
  }

  if (typeof priceLevel === 'string' && priceLevel.trim().length > 0) {
    const s = priceLevel.trim();
    if (/^\d+$/.test(s)) {
      const n = Math.max(0, Math.min(4, Math.floor(Number(s))));
      return '$'.repeat(n + 1);
    }

    const lower = s.toLowerCase();
    if (lower.includes('free')) return 'Free';
    if (lower.includes('inexpensive') || lower.includes('cheap')) return '$';
    if (lower.includes('moderate')) return '$$';
    if (lower.includes('expensive')) return '$$$';
    if (lower.includes('very') || lower.includes('luxury') || lower.includes('premium')) return '$$$$';
  }

  return null;
}

interface PageProps {
  searchParams: Promise<{ city?: string; category?: string; q?: string }>;
}

export default async function BusinessesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cityFilter = params.city || '';
  const categoryFilter = params.category || '';
  const q = (params.q || '').trim();

  // Build where clause
  const where: any = {};
  if (cityFilter) where.city = cityFilter;
  if (categoryFilter) where.category = categoryFilter;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
    ];
  }

  const businesses = await prisma.business.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      city: true,
      state: true,
      logoUrl: true,
      coverUrl: true,
      isVerified: true,
      ownerId: true,
      createdAt: true,
      aggregateRating: true,
      totalRatings: true,
      priceLevel: true,
      priceRange: true,
      _count: {
        select: {
          deals: {
            where: {
              dealStatus: 'ACTIVE',
            },
          },
        },
      },
    },
    orderBy: [
      { isVerified: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50,
  });

  // Get unique cities and categories for filters
  const allBusinesses = await prisma.business.findMany({
    select: {
      city: true,
      category: true,
    },
  });

  const cities = [...new Set(allBusinesses.map(b => b.city).filter(Boolean))].sort();
  const categories = [...new Set(allBusinesses.map(b => b.category).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      {/* Page Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('https://019bb44e-0d7e-7695-9ab5-ee7e0fcf0839.mochausercontent.com/header.jpg')",
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <p className="text-white/90 text-sm font-semibold">
            Serving all 15 Lake County Cities · 100% Free Business Listings
          </p>

          <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {q
              ? `Search results for "${q}"`
              : cityFilter && categoryFilter
              ? `${categoryFilter} in ${cityFilter}`
              : cityFilter
              ? `Businesses in ${cityFilter}`
              : categoryFilter
              ? categoryFilter
              : 'Business Directory'}
          </h1>
          <p className="mt-3 text-white/80">
            {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} found
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar - Exact ZIP Structure */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sticky top-24"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Filters</h2>

              {/* City Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-3">City</h3>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/businesses"
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                      !cityFilter
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All Cities
                  </Link>
                  {cities.map((city) => (
                    <Link
                      key={city}
                      href={`/businesses?city=${city}${categoryFilter ? `&category=${categoryFilter}` : ''}`}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        cityFilter === city
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Category</h3>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/businesses${cityFilter ? `?city=${cityFilter}` : ''}`}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                      !categoryFilter
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All Categories
                  </Link>
                  {categories.slice(0, 10).map((cat) => (
                    <Link
                      key={cat}
                      href={`/businesses?category=${cat}${cityFilter ? `&city=${cityFilter}` : ''}`}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        categoryFilter === cat
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Business Grid - Exact ZIP Structure */}
          <div className="lg:col-span-3">
            {businesses.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {businesses.map((business, idx) => {
                  const isClaimed = business.ownerId !== null;
                  const profileUrl = business.slug
                    ? `/business/${business.slug}`
                    : `/business/${business.id}`;

                  const hero = (business.coverUrl || business.logoUrl || '').trim();
                  const hasHero = hero.length > 0;

                  const ratingRaw = business.aggregateRating ?? null;
                  const rating = typeof ratingRaw === 'number' && ratingRaw > 0 ? ratingRaw : null;
                  const ratingText = rating ? rating.toFixed(1) : null;
                  const ratingsCount = business.totalRatings ?? null;
                  const priceText = priceToText(business.priceLevel, business.priceRange);

                  const isNew = (() => {
                    const ageDays = (Date.now() - new Date(business.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                    return ageDays <= 30;
                  })();

                  return (
                    <Link
                      key={business.id}
                      href={profileUrl}
                      className="group relative overflow-hidden rounded-2xl bg-slate-200 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      {/* Image background */}
                      <div className="relative h-60">
                        {hasHero ? (
                          <img
                            src={hero}
                            alt={business.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
                            <span className="text-6xl font-extrabold text-white/80">{business.name.charAt(0)}</span>
                          </div>
                        )}

                        {/* Dark overlay */}
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
                          {business.isVerified ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white shadow">
                              Verified
                            </span>
                          ) : null}
                          {isNew ? (
                            <span className="inline-flex items-center rounded-full bg-sky-500/90 px-3 py-1 text-[11px] font-extrabold text-white shadow">
                              New
                            </span>
                          ) : null}
                          {business._count.deals > 0 ? (
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

                        {/* Bottom content */}
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <div className="text-xl font-extrabold text-white drop-shadow-sm line-clamp-1">
                            {business.name}
                          </div>
                          <div className="mt-1 text-sm text-white/85 line-clamp-1">
                            {(business.city || 'Lake County') + (business.state ? `, ${business.state}` : '')}
                          </div>

                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {business.category ? (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold text-white backdrop-blur">
                                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                                    <span className="truncate">{business.category}</span>
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
                            </div>

                            <span className="inline-flex items-center rounded-md bg-white/15 px-3 py-2 text-[11px] font-extrabold text-white backdrop-blur">
                              View
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div
                className="bg-white rounded-lg text-center"
                style={{ border: '1px solid #e5e7eb', padding: '48px' }}
              >
                <div
                  className="rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ width: '64px', height: '64px', background: '#f3f4f6' }}
                >
                  <svg className="w-8 h-8" style={{ color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  No businesses found
                </h3>
                <p style={{ color: '#4b5563', marginBottom: '16px' }}>
                  Try adjusting your filters or{' '}
                  <Link href="/businesses" style={{ color: '#2563eb', fontWeight: '500' }}>
                    view all businesses
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
        </div>

        <PublicFooter countyName="Lake County" state="Florida" />
      </main>

      <AdminQuickNav />
    </div>
  );
}
