'use client'

import { useState } from 'react'

interface FeatureToggleProps {
  businessId: string
  businessName: string
  initialIsFeatured: boolean
  onToggle?: (isFeatured: boolean) => void
}

export default function FeatureToggle({
  businessId,
  businessName,
  initialIsFeatured,
  onToggle,
}: FeatureToggleProps) {
  const [isFeatured, setIsFeatured] = useState(initialIsFeatured)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      const response = await fetch('/api/admin/business/featured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          isFeatured: !isFeatured,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update featured status')
      }

      const data = await response.json()
      const newStatus = data.updatedBusiness.isFeatured
      setIsFeatured(newStatus)
      onToggle?.(newStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update featured status'
      setError(message)
      console.error('Error toggling featured status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        title={isFeatured ? 'Remove from featured' : 'Add to featured'}
        className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
          isFeatured
            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? 'Updating...' : isFeatured ? '★ Featured' : '☆ Feature'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
