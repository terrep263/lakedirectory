'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface DealsSortProps {
  currentSort?: string
}

export default function DealsSort({ currentSort = 'newest' }: DealsSortProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSort = useCallback((sortValue: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (sortValue === 'newest') {
      params.delete('sort')
    } else {
      params.set('sort', sortValue)
    }
    
    router.push(`/deals?${params.toString()}`)
  }, [router, searchParams])

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'discount', label: 'Highest Discount' },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-700">Sort by:</span>
      <select
        value={currentSort}
        onChange={(e) => handleSort(e.target.value)}
        className="rounded-lg border-slate-300 py-2 pl-3 pr-10 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-blue-500"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
