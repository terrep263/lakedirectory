'use client'

import Link from 'next/link'

interface DealCardProps {
  deal: {
    id: string
    dealTitle: string
    dealDescription: string | null
    dealPrice: number
    originalPrice: number | null
    business: {
      name: string
      slug: string | null
      city: string | null
      state: string | null
      logoUrl: string | null
      coverUrl: string | null
      category: string | null
      founderStatus?: {
        isActive: boolean
      } | null
    }
    _count?: {
      vouchers: number
    }
  }
}

export default function DealCard({ deal }: DealCardProps) {
  const discount = deal.originalPrice
    ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)
    : null

  const isFounder = deal.business.founderStatus?.isActive ?? false
  const availableVouchers = deal._count?.vouchers ?? 0

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-shadow"
    >
      {/* Image */}
      <div className="relative h-48 bg-slate-200 overflow-hidden">
        {deal.business.coverUrl || deal.business.logoUrl ? (
          <img
            src={deal.business.coverUrl || deal.business.logoUrl || ''}
            alt={deal.dealTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-sky-600 flex items-center justify-center">
            <span className="text-6xl font-extrabold text-white/20">
              {deal.business.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isFounder && (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white shadow">
              🏆 Founding Partner
            </span>
          )}
          {discount && discount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold text-white shadow">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Available Count */}
        {availableVouchers > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow">
              {availableVouchers} available
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Business Info */}
        <div className="flex items-center gap-2 mb-3">
          {deal.business.logoUrl && (
            <img
              src={deal.business.logoUrl}
              alt={deal.business.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {deal.business.name}
            </p>
            <p className="text-xs text-slate-500">
              {deal.business.city}, {deal.business.state}
            </p>
          </div>
        </div>

        {/* Deal Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {deal.dealTitle}
        </h3>

        {/* Description */}
        {deal.dealDescription && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
            {deal.dealDescription}
          </p>
        )}

        {/* Pricing */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-extrabold text-emerald-600">
            ${deal.dealPrice.toFixed(2)}
          </span>
          {deal.originalPrice && deal.originalPrice > deal.dealPrice && (
            <span className="text-sm font-medium text-slate-400 line-through">
              ${deal.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* CTA */}
        <button className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
          Buy Voucher
        </button>
      </div>
    </Link>
  )
}
