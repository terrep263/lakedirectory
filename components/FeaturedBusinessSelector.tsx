'use client'

import React, { useState, useEffect } from 'react'

interface FeaturedBusinessSelectorProps {
  businessId: string
  onStatusChange?: (isFeatured: boolean) => void
}

export default function FeaturedBusinessSelector({
  businessId,
  onStatusChange,
}: FeaturedBusinessSelectorProps) {
  const [isFeatured, setIsFeatured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch initial featured status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/business/${businessId}`)
        if (!res.ok) throw new Error('Failed to fetch business')

        const data = await res.json()
        setIsFeatured(data.isFeatured ?? false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading status')
        setIsFeatured(false)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchStatus()
    }
  }, [businessId])

  const toggleFeatured = async () => {
    const newStatus = !isFeatured

    try {
      setUpdating(true)
      setError(null)
      setSuccess(false)

      const res = await fetch('/api/admin/business/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, isFeatured: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update featured status')
      }

      setIsFeatured(newStatus)
      setSuccess(true)
      onStatusChange?.(newStatus)

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Loading status...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      {/* Status Display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Featured Status</p>
          <p className="text-sm text-gray-600">
            {isFeatured ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                Featured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                Not Featured
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleFeatured}
        disabled={updating}
        className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          isFeatured
            ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50'
            : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50'
        }`}
      >
        {updating ? (
          <>
            <span className="inline-block animate-spin mr-2">⟳</span>
            Updating...
          </>
        ) : isFeatured ? (
          'Remove from Featured'
        ) : (
          'Add to Featured'
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">
            {isFeatured
              ? '✓ Added to featured businesses'
              : '✓ Removed from featured'}
          </p>
        </div>
      )}
    </div>
  )
}
