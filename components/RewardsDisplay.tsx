'use client'

import { useEffect, useState } from 'react'

interface RewardBalance {
  balance: number
  history: Array<{
    id: string
    points: number
    eventType: string
    description: string | null
    createdAt: string
  }>
  totalEvents: number
}

export function RewardsDisplay() {
  const [rewards, setRewards] = useState<RewardBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRewards()
  }, [])

  const fetchRewards = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rewards?limit=10')
      
      if (!response.ok) {
        throw new Error('Failed to fetch rewards')
      }

      const data = await response.json()
      setRewards(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        {error}
      </div>
    )
  }

  if (!rewards) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Rewards</h3>
          <p className="text-sm text-gray-600">Earn points by sharing deals</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">{rewards.balance}</div>
          <div className="text-xs text-gray-500">points</div>
        </div>
      </div>

      {rewards.history.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {rewards.history.map((event) => (
              <div key={event.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-900">{event.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-green-600 font-medium">+{event.points}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
