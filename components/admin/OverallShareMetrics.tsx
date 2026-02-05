'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface OverallShareMetrics {
  summary: {
    totalShares: number
    byPlatform: {
      facebook: number
      instagram: number
      twitter: number
      linkedin: number
    }
    totalRewardsGiven: number
  }
  topSharedBusinesses: Array<{
    businessId: string
    businessName: string
    businessSlug: string | null
    shareCount: number
  }>
  recentShares: Array<{
    id: string
    platform: string
    userEmail: string
    business: {
      id: string
      name: string
    } | null
    deal: {
      id: string
      title: string
    } | null
    createdAt: string
  }>
}

interface OverallShareMetricsProps {
  countyId?: string
}

export function OverallShareMetrics({ countyId }: OverallShareMetricsProps) {
  const [data, setData] = useState<OverallShareMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    if (!token) {
      setLoading(false)
      setError('Missing admin token. Please sign in again.')
      return
    }

    const url = countyId 
      ? `/api/admin/share-metrics?countyId=${countyId}`
      : '/api/admin/share-metrics'

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch share metrics')
        }
        return res.json()
      })
      .then((data: OverallShareMetrics) => {
        setData(data)
        setError(null)
      })
      .catch((error) => {
        console.error('Error fetching share metrics:', error)
        setError(error.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [countyId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">Error loading share metrics: {error}</p>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { summary, topSharedBusinesses, recentShares } = data

  return (
    <div className="space-y-6">
      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Facebook</h3>
            <span className="text-2xl">📘</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{summary.byPlatform.facebook}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Instagram</h3>
            <span className="text-2xl">📷</span>
          </div>
          <p className="text-3xl font-bold text-pink-600">{summary.byPlatform.instagram}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Twitter</h3>
            <span className="text-2xl">🐦</span>
          </div>
          <p className="text-3xl font-bold text-sky-500">{summary.byPlatform.twitter}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">LinkedIn</h3>
            <span className="text-2xl">💼</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{summary.byPlatform.linkedin}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total</h3>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold">{summary.totalShares}</p>
          <p className="text-xs opacity-75 mt-1">all shares</p>
        </div>
      </div>

      {/* Rewards Summary */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium opacity-90 mb-2">Total Rewards Given</h3>
            <p className="text-3xl font-bold">{summary.totalRewardsGiven}</p>
            <p className="text-xs opacity-75 mt-1">points awarded for shares</p>
          </div>
          <span className="text-4xl">🎁</span>
        </div>
      </div>

      {/* Top Shared Businesses */}
      {topSharedBusinesses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Shared Businesses</h3>
          <div className="space-y-3">
            {topSharedBusinesses.map((business, index) => (
              <div
                key={business.businessId}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <Link
                      href={`/admin/businesses/manage/${business.businessId}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {business.businessName}
                    </Link>
                    {business.businessSlug && (
                      <p className="text-xs text-gray-500">/{business.businessSlug}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">{business.shareCount}</p>
                  <p className="text-xs text-gray-500">shares</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentShares.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Share Activity</h3>
          <div className="space-y-3">
            {recentShares.slice(0, 15).map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {share.platform === 'facebook' && '📘'}
                    {share.platform === 'instagram' && '📷'}
                    {share.platform === 'twitter' && '🐦'}
                    {share.platform === 'linkedin' && '💼'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {share.business?.name || share.deal?.title || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {share.userEmail} • {' '}
                      {new Date(share.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 capitalize">{share.platform}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
