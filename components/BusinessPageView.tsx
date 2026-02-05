'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import FeaturedBusinessSelector from '@/components/FeaturedBusinessSelector'

interface Deal {
  id: string
  title: string
  description: string | null
  dealStatus: string
  originalValue: number | null
  dealPrice: number | null
  voucherQuantityLimit: number | null
  redemptionWindowStart: string | null
  redemptionWindowEnd: string | null
  createdAt: string
}

interface BusinessData {
  business: {
    id: string
    name: string
    slug: string
    description: string | null
    category: string | null
    address: string | null
    city: string | null
    state: string | null
    phone: string | null
    website: string | null
    isVerified: boolean
    isFeatured: boolean
    businessStatus: string
    recommendationCount: number
    deals: Deal[]
    county: {
      id: string
      name: string
      slug: string
    } | null
  }
  metrics: {
    totalShares: number
    totalRecommendations: number
    totalRewardPoints: number
    dealsCount: number
  }
}

interface BusinessPageViewProps {
  businessId: string
}

export default function BusinessPageView({ businessId }: BusinessPageViewProps) {
  const [businessData, setBusinessData] = useState<BusinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/admin/business/${businessId}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('Business not found')
          throw new Error('Failed to load business details')
        }

        const data = await res.json()
        setBusinessData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading business')
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchBusinessData()
    }
  }, [businessId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 h-8 w-8" />
          <p className="mt-4 text-gray-600">Loading business details...</p>
        </div>
      </div>
    )
  }

  if (error || !businessData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-700 font-medium">Error</p>
        <p className="text-red-600 text-sm mt-1">{error || 'No business data'}</p>
      </div>
    )
  }

  const { business, metrics } = businessData
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    DRAFT: 'bg-yellow-100 text-yellow-800',
    SUSPENDED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
              {business.isVerified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-2">{business.description}</p>
          </div>

          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[business.businessStatus] || 'bg-gray-100 text-gray-800'}`}>
              {business.businessStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">Total Shares</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalShares}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">Recommendations</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalRecommendations}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">Reward Points</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalRewardPoints}</p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">Active Deals</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.dealsCount}</p>
        </div>
      </div>

      {/* Business Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact & Location */}
        <div className="rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & Location</h2>
          <div className="space-y-3 text-sm">
            {business.address && (
              <div>
                <p className="text-gray-600">Address</p>
                <p className="text-gray-900">{business.address}</p>
              </div>
            )}
            {business.city && (
              <div>
                <p className="text-gray-600">City</p>
                <p className="text-gray-900">
                  {business.city}, {business.state} {business.state}
                </p>
              </div>
            )}
            {business.phone && (
              <div>
                <p className="text-gray-600">Phone</p>
                <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                  {business.phone}
                </a>
              </div>
            )}
            {business.website && (
              <div>
                <p className="text-gray-600">Website</p>
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                  {business.website}
                </a>
              </div>
            )}
            {business.county && (
              <div>
                <p className="text-gray-600">County</p>
                <p className="text-gray-900">{business.county.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Management */}
        <div className="space-y-4">
          {/* Featured Status */}
          <div className="rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
            <FeaturedBusinessSelector
              businessId={business.id}
              onStatusChange={(isFeatured) => {
                setBusinessData({
                  ...businessData,
                  business: { ...business, isFeatured },
                })
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/admin/businesses/edit/${businessId}`}
              className="flex-1 rounded-lg bg-blue-600 text-white px-4 py-2 text-center font-medium hover:bg-blue-700 transition-colors"
            >
              Edit Business
            </Link>
            <Link
              href={`/business/${business.slug}`}
              target="_blank"
              className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-700 px-4 py-2 text-center font-medium hover:bg-gray-50 transition-colors"
            >
              View Public Page
            </Link>
          </div>
        </div>
      </div>

      {/* Deals Section */}
      <div className="rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Deals ({business.deals.length})</h2>
          <Link
            href={`/admin/deals/new?businessId=${business.id}`}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            + Create Deal
          </Link>
        </div>

        {business.deals.length === 0 ? (
          <p className="text-gray-600 text-sm py-4">No deals created yet</p>
        ) : (
          <div className="space-y-4">
            {business.deals.map((deal) => (
              <div key={deal.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{deal.title}</h3>
                    {deal.description && (
                      <p className="text-gray-600 text-sm mt-1">{deal.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      {deal.originalValue && (
                        <div>
                          <span className="text-gray-600">Original: </span>
                          <span className="font-medium text-gray-900">${deal.originalValue}</span>
                        </div>
                      )}
                      {deal.dealPrice && (
                        <div>
                          <span className="text-gray-600">Deal: </span>
                          <span className="font-medium text-gray-900">${deal.dealPrice}</span>
                        </div>
                      )}
                      {deal.voucherQuantityLimit && (
                        <div>
                          <span className="text-gray-600">Limit: </span>
                          <span className="font-medium text-gray-900">{deal.voucherQuantityLimit}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      deal.dealStatus === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {deal.dealStatus}
                    </span>
                    <Link
                      href={`/admin/deals/edit/${deal.id}`}
                      className="block text-blue-600 hover:underline text-xs font-medium mt-2"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
