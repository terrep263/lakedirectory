import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface DealDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: DealDetailPageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const deal = await prisma.deal.findUnique({
      where: { id },
      select: {
        dealTitle: true,
        dealDescription: true,
        dealPrice: true,
        business: {
          select: {
            name: true,
            city: true,
            state: true,
          },
        },
      },
    })

    if (!deal) {
      return {
        title: 'Deal Not Found | Lake County Local',
      }
    }

    return {
      title: `${deal.dealTitle} - ${deal.business.name} | Lake County Local`,
      description: deal.dealDescription || `Get ${deal.dealTitle} for $${deal.dealPrice} at ${deal.business.name} in ${deal.business.city}, ${deal.business.state}`,
    }
  } catch {
    return {
      title: 'Deal | Lake County Local',
    }
  }
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { id } = await params

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          phone: true,
          website: true,
          logoUrl: true,
          coverUrl: true,
          hours: true,
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
  })

  if (!deal || deal.dealStatus !== 'ACTIVE') {
    notFound()
  }

  const discount = deal.originalPrice
    ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)
    : null

  const isFounder = deal.business.founderStatus?.isActive ?? false
  const availableVouchers = deal._count.vouchers

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/deals" className="hover:text-slate-900">Deals</Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900 font-medium truncate">{deal.dealTitle}</span>
          </div>
        </div>
      </div>

      <main className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Deal Card */}
              <div className="rounded-xl bg-white shadow-lg overflow-hidden">
                {/* Deal Image */}
                <div className="relative h-80 bg-slate-200">
                  {deal.business.coverUrl || deal.business.logoUrl ? (
                    <img
                      src={deal.business.coverUrl || deal.business.logoUrl || ''}
                      alt={deal.dealTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-sky-600 flex items-center justify-center">
                      <span className="text-8xl font-extrabold text-white/20">
                        {deal.business.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {isFounder && (
                      <span className="inline-flex items-center rounded-full bg-amber-500 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
                        🏆 Founding Partner
                      </span>
                    )}
                    {discount && discount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
                        {discount}% OFF
                      </span>
                    )}
                  </div>

                  {/* Available Count */}
                  {availableVouchers > 0 && (
                    <div className="absolute bottom-4 right-4">
                      <span className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
                        {availableVouchers} available
                      </span>
                    </div>
                  )}
                </div>

                {/* Deal Info */}
                <div className="p-8">
                  <div className="mb-6">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-4">
                      {deal.dealTitle}
                    </h1>
                    
                    {/* Business Link */}
                    <Link
                      href={`/business/${deal.business.slug || deal.business.id}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      {deal.business.logoUrl && (
                        <img
                          src={deal.business.logoUrl}
                          alt={deal.business.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span>{deal.business.name}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>

                  {/* Pricing */}
                  <div className="mb-8 p-6 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-5xl font-extrabold text-emerald-600">
                        ${deal.dealPrice.toFixed(2)}
                      </span>
                      {deal.originalPrice && deal.originalPrice > deal.dealPrice && (
                        <>
                          <span className="text-xl font-medium text-slate-400 line-through">
                            ${deal.originalPrice.toFixed(2)}
                          </span>
                          {discount && (
                            <span className="inline-flex items-center rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">
                              Save {discount}%
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {availableVouchers > 0
                        ? `${availableVouchers} vouchers available`
                        : 'Limited availability'}
                    </p>
                  </div>

                  {/* Purchase Button */}
                  <button className="w-full rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all mb-6">
                    Buy Voucher Now
                  </button>

                  {/* Description */}
                  {deal.dealDescription && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-slate-900 mb-3">About This Deal</h2>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {deal.dealDescription}
                      </p>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  {deal.termsConditions && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-slate-900 mb-3">Terms & Conditions</h2>
                      <div className="prose prose-sm max-w-none text-slate-600">
                        <p className="whitespace-pre-wrap">{deal.termsConditions}</p>
                      </div>
                    </div>
                  )}

                  {/* Redemption Instructions */}
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      How to Redeem
                    </h2>
                    <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                      <li>Purchase your voucher above</li>
                      <li>Receive voucher code via email instantly</li>
                      <li>Present voucher code at {deal.business.name}</li>
                      <li>Staff will scan and verify your code</li>
                      <li>Enjoy your deal!</li>
                    </ol>
                    {deal.redemptionInstructions && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {deal.redemptionInstructions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Deal Dates */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {deal.validFrom && (
                        <div>
                          <span className="font-semibold text-slate-600">Valid From:</span>
                          <p className="text-slate-900">
                            {new Date(deal.validFrom).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      {deal.validUntil && (
                        <div>
                          <span className="font-semibold text-slate-600">Valid Until:</span>
                          <p className="text-slate-900">
                            {new Date(deal.validUntil).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Business Info Card */}
                <div className="rounded-xl bg-white shadow-lg p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Business Information</h3>
                  
                  {/* Logo */}
                  {deal.business.logoUrl && (
                    <div className="mb-4">
                      <img
                        src={deal.business.logoUrl}
                        alt={deal.business.name}
                        className="w-20 h-20 rounded-xl object-cover mx-auto"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Link
                        href={`/business/${deal.business.slug || deal.business.id}`}
                        className="text-xl font-bold text-blue-600 hover:text-blue-700"
                      >
                        {deal.business.name}
                      </Link>
                      {deal.business.category && (
                        <p className="text-sm text-slate-600 mt-1">{deal.business.category}</p>
                      )}
                    </div>

                    {deal.business.description && (
                      <p className="text-sm text-slate-700 line-clamp-3">
                        {deal.business.description}
                      </p>
                    )}

                    {deal.business.address && (
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="text-sm">
                          <p className="text-slate-900">{deal.business.address}</p>
                          <p className="text-slate-600">
                            {deal.business.city}, {deal.business.state} {deal.business.zipCode}
                          </p>
                        </div>
                      </div>
                    )}

                    {deal.business.phone && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <a
                          href={`tel:${deal.business.phone}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {deal.business.phone}
                        </a>
                      </div>
                    )}

                    {deal.business.website && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <a
                          href={deal.business.website.startsWith('http') ? deal.business.website : `https://${deal.business.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium truncate"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/business/${deal.business.slug || deal.business.id}`}
                    className="mt-6 block w-full rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    View Full Business Profile
                  </Link>
                </div>

                {/* Business Hours */}
                {deal.business.hours && typeof deal.business.hours === 'object' && (
                  <div className="rounded-xl bg-white shadow-lg p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Business Hours</h3>
                    <div className="space-y-2 text-sm">
                      {Object.entries(deal.business.hours as Record<string, string>).map(([day, time]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize font-medium text-slate-700">{day}</span>
                          <span className="text-slate-600">{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Share Deal */}
                <div className="rounded-xl bg-white shadow-lg p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Share This Deal</h3>
                  <div className="flex gap-3">
                    <button className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      Facebook
                    </button>
                    <button className="flex-1 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                      Twitter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter countyName="Lake County" state="Florida" />
    </div>
  )
}
