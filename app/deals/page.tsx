import { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import DealCard from '@/components/deals/DealCard'
import DealsSearch from '@/components/deals/DealsSearch'
import DealsSort from '@/components/deals/DealsSort'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Browse Local Deals | Lake County Local',
  description: 'Exclusive vouchers and deals from Lake County businesses. Save on dining, services, activities and more.',
}

interface DealsPageProps {
  searchParams: Promise<{ 
    category?: string
    city?: string
    q?: string
    sort?: string
  }>
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const params = await searchParams
  const categoryFilter = params.category
  const cityFilter = params.city
  const searchQuery = params.q
  const sortBy = params.sort || 'newest'

  // Build where clause
  const whereClause: any = {
    dealStatus: 'ACTIVE',
    ...(categoryFilter && {
      business: { category: { contains: categoryFilter, mode: 'insensitive' } },
    }),
    ...(cityFilter && {
      business: { city: { contains: cityFilter, mode: 'insensitive' } },
    }),
  }

  // Add search query
  if (searchQuery) {
    whereClause.OR = [
      { dealTitle: { contains: searchQuery, mode: 'insensitive' } },
      { dealDescription: { contains: searchQuery, mode: 'insensitive' } },
      { business: { name: { contains: searchQuery, mode: 'insensitive' } } },
    ]
  }

  // Build order by clause
  let orderByClause: any
  switch (sortBy) {
    case 'price-low':
      orderByClause = [{ dealPrice: 'asc' }]
      break
    case 'price-high':
      orderByClause = [{ dealPrice: 'desc' }]
      break
    case 'discount':
      // Sort by discount percentage (calculated field)
      orderByClause = [{ createdAt: 'desc' }] // Fallback to newest
      break
    case 'newest':
    default:
      orderByClause = [
        { business: { founderStatus: { isActive: 'desc' } } },
        { createdAt: 'desc' },
      ]
      break
  }

  let deals: any[] = []
  try {
    deals = await prisma.deal.findMany({
      where: whereClause,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            logoUrl: true,
            coverUrl: true,
            category: true,
            founderStatus: {
              select: {
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            vouchers: {
              where: { voucherStatus: 'ISSUED' },
            },
          },
        },
      },
      orderBy: orderByClause,
      take: 50,
    })
  } catch (error) {
    console.error('Error fetching deals:', error)
    // Return empty array on error - page will show "no deals" message
    deals = []
  }

  // Get unique cities and categories for filters
  let allDeals: any[] = []
  try {
    allDeals = await prisma.deal.findMany({
      where: { dealStatus: 'ACTIVE' },
      select: {
        business: {
          select: {
            city: true,
            category: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching filter options:', error)
    allDeals = []
  }

  const cities = [...new Set(allDeals.map((d) => d.business.city).filter(Boolean))].sort()
  const categories = [...new Set(allDeals.map((d) => d.business.category).filter(Boolean))].sort()

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-gradient-to-br from-blue-900 to-sky-600"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("https://019bb44e-0d7e-7695-9ab5-ee7e0fcf0839.mochausercontent.com/header.jpg")',
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-white/90 text-sm font-semibold">
              Exclusive Local Deals · Save on Dining, Services & More
            </p>
            <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              {categoryFilter && cityFilter
                ? `${categoryFilter} Deals in ${cityFilter}`
                : categoryFilter
                ? `${categoryFilter} Deals`
                : cityFilter
                ? `Deals in ${cityFilter}`
                : 'Browse All Deals'}
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-2xl">
              Support local businesses and save with exclusive voucher deals from Lake County&apos;s best.
            </p>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <DealsSearch initialQuery={searchQuery} />
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/deals"
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                !categoryFilter && !cityFilter
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Deals
            </Link>

            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat}
                href={`/deals?category=${encodeURIComponent(cat)}`}
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <span className="text-sm font-medium text-slate-600">Filter by city:</span>
            {cities.slice(0, 8).map((city) => (
              <Link
                key={city}
                href={`/deals?city=${encodeURIComponent(city)}`}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  cityFilter === city
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <main className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {deals.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-slate-600">No active deals found for this filter.</p>
              <Link
                href="/deals"
                className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                ← View all deals
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">
                    Showing {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
                  </p>
                  {searchQuery && (
                    <p className="text-sm text-slate-500 mt-1">
                      Search results for: <span className="font-semibold">"{searchQuery}"</span>
                    </p>
                  )}
                </div>
                <DealsSort currentSort={sortBy} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <PublicFooter countyName="Lake County" state="Florida" />
    </div>
  )
}
