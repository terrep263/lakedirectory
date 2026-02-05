'use client'

import { useEffect, useState } from 'react'

interface ShareMetricsData {
  business: {
    id: string
    name: string
  }
  shares: {
    byPlatform: {
      facebook: number
      instagram: number
      twitter: number
      linkedin: number
    }
    total: number
  }
  recentShares: Array<{
    id: string
    platform: string
    userId: string
    userEmail: string
    createdAt: string
  }>
}

interface ShareMetricsProps {
  businessId: string
}

export function ShareMetrics({ businessId }: ShareMetricsProps) {
  const [data, setData] = useState<ShareMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) return

    // Fetch share metrics from the backend
    fetch(`/api/admin/share-metrics/${businessId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch share metrics')
        }
        return res.json()
      })
      .then((data: ShareMetricsData) => {
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
  }, [businessId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
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

  const { shares } = data

  return (
    <div className="space-y-6">
      {/* Share Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Facebook Shares */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Facebook</h3>
            <span className="text-2xl">📘</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{shares.byPlatform.facebook}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        {/* Instagram Shares */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Instagram</h3>
            <span className="text-2xl">📷</span>
          </div>
          <p className="text-3xl font-bold text-pink-600">{shares.byPlatform.instagram}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        {/* Twitter Shares */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Twitter</h3>
            <span className="text-2xl">🐦</span>
          </div>
          <p className="text-3xl font-bold text-sky-500">{shares.byPlatform.twitter}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        {/* LinkedIn Shares */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">LinkedIn</h3>
            <span className="text-2xl">💼</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{shares.byPlatform.linkedin}</p>
          <p className="text-xs text-gray-500 mt-1">shares</p>
        </div>

        {/* Total Shares */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Shares</h3>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold">{shares.total}</p>
          <p className="text-xs opacity-75 mt-1">all platforms</p>
        </div>
      </div>

      {/* Recent Shares */}
      {data.recentShares.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Shares</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentShares.slice(0, 10).map((share) => (
                  <tr key={share.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        {share.platform === 'facebook' && '📘'}
                        {share.platform === 'instagram' && '📷'}
                        {share.platform === 'twitter' && '🐦'}
                        {share.platform === 'linkedin' && '💼'}
                        <span className="text-sm text-gray-900 capitalize">
                          {share.platform}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {share.userEmail}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(share.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
