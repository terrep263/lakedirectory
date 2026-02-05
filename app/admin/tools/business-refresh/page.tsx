'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type RefreshStatus = 'idle' | 'loading' | 'success' | 'error'

interface RefreshResult {
  jobId?: string
  totalSelected?: number
  refreshedCount?: number
  updatedCount?: number
  unchangedCount?: number
  incompleteCount?: number
  verificationFailedCount?: number
  manualReviewCount?: number
  error?: string
}

export default function BusinessRefreshToolPage() {
  const router = useRouter()
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  useEffect(() => {
    if (!adminToken) {
      router.push('/admin-login')
    }
  }, [adminToken, router])

  const [status, setStatus] = useState<RefreshStatus>('idle')
  const [result, setResult] = useState<RefreshResult | null>(null)

  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')

  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  useEffect(() => {
    const loadOptions = async () => {
      if (!adminToken) return
      setOptionsLoading(true)
      setOptionsError(null)

      try {
        // Single-county (Lake) closed system: fixed 15-city list used by Google Places import/refresh.
        // This is the fallback source of truth for the refresh tool UI.
        const lakeCountyCities = [
          'Astatula',
          'Astor',
          'Clermont',
          'Eustis',
          'Fruitland Park',
          'Groveland',
          'Howey-in-the-Hills',
          'Lady Lake',
          'Leesburg',
          'Mascotte',
          'Minneola',
          'Montverde',
          'Mount Dora',
          'Tavares',
          'Umatilla',
        ] as const

        // Categories are a closed set (12). Keep the admin UI consistent.
        const fixedCategories = [
          'Restaurants & Dining',
          'Health & Wellness',
          'Beauty & Spa',
          'Entertainment',
          'Retail & Shopping',
          'Services',
          'Automotive',
          'Home & Garden',
          'Professional Services',
          'Education',
          'Pet Services',
          'Travel & Lodging',
        ] as const

        setCategoryOptions([...fixedCategories])
        if (!category) setCategory(fixedCategories[0])

        // Cities are curated (15) and county-scoped. Use the Cities module as truth.
        let cities: string[] = []
        try {
          const res = await fetch('/api/admin/cities', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok && data?.success && Array.isArray(data?.data?.cities)) {
            cities = data.data.cities
              .filter((c: any) => c?.isActive !== false)
              .map((c: any) => c?.name)
              .filter((n: any) => typeof n === 'string' && n.trim().length > 0)
          }
        } catch {
          // ignore; fallback below
        }

        // Enforce closed-system expectation: exactly the Lake County 15-city list.
        // If the Cities module returns anything else (or is unavailable), fall back to the fixed list.
        const normalizedFromApi = cities.map((c) => c.trim())
        const normalizedFixed = Array.from(lakeCountyCities)
        const useFixed =
          normalizedFromApi.length !== 15 ||
          normalizedFromApi.some((c) => !normalizedFixed.includes(c as any))

        const finalCities = useFixed ? normalizedFixed : normalizedFromApi
        setCityOptions(finalCities)
        if (!city) setCity(finalCities[0])
      } catch (e) {
        setCityOptions([])
        setCategoryOptions([])
        setOptionsError(e instanceof Error ? e.message : 'Failed to load dropdown options')
      } finally {
        setOptionsLoading(false)
      }
    }

    loadOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  const handleRefresh = useCallback(async () => {
    setStatus('loading')
    setResult(null)

    try {
      if (!adminToken) {
        setStatus('error')
        setResult({ error: 'Missing admin token. Please sign in again.' })
        router.push('/admin-login')
        return
      }

      const cityValue = city.trim()
      const categoryValue = category.trim()
      if (!cityValue || !categoryValue) {
        setStatus('error')
        setResult({ error: 'City and Category are required.' })
        return
      }

      const response = await fetch('/api/admin/business/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ city: cityValue, category: categoryValue }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken')
          router.push('/admin-login')
        }
        setStatus('error')
        setResult({ error: data.error || 'Refresh failed' })
        return
      }

      setStatus('success')
      setResult(data)
    } catch (err) {
      setStatus('error')
      setResult({ error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [city, category, adminToken, router])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Refresh</h1>
          <p className="text-sm text-gray-600">
            Refresh businesses from Google Places for a specific City + Category.
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/tools')}
          className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        {optionsError && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            {optionsError}{' '}
            <button
              onClick={() => router.push('/admin/county')}
              className="underline font-medium hover:text-amber-950"
            >
              Set County Context →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={optionsLoading || cityOptions.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              {cityOptions.length === 0 ? (
                <option value="">{optionsLoading ? 'Loading…' : 'No cities available'}</option>
              ) : (
                cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={optionsLoading || categoryOptions.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              {categoryOptions.length === 0 ? (
                <option value="">{optionsLoading ? 'Loading…' : 'No categories available'}</option>
              ) : (
                categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleRefresh}
            disabled={status === 'loading' || optionsLoading || !city || !category}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
          >
            {status === 'loading' ? 'Refreshing…' : 'Refresh now'}
          </button>
          <p className="text-xs text-gray-600 mt-3">
            This will re-pull Google Places data and update any changed fields for every business matching the filter.
          </p>
        </div>

        {status === 'success' && result && (
          <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Refresh Started</h3>
            <div className="text-sm text-green-800 space-y-2">
              {result.jobId && (
                <div>
                  <span className="font-medium">Job ID:</span>
                  <code className="ml-2 font-mono bg-white px-2 py-1 rounded border border-green-300">
                    {result.jobId}
                  </code>
                </div>
              )}
              {result.totalSelected !== undefined && (
                <p>
                  <span className="font-medium">Businesses Selected:</span> {result.totalSelected}
                </p>
              )}
              {result.refreshedCount !== undefined && (
                <p>
                  <span className="font-medium">Refreshed:</span> {result.refreshedCount}
                </p>
              )}
              {result.updatedCount !== undefined && (
                <p>
                  <span className="font-medium">Updated:</span> {result.updatedCount}
                </p>
              )}
              {result.unchangedCount !== undefined && (
                <p>
                  <span className="font-medium">Unchanged:</span> {result.unchangedCount}
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && result?.error && (
          <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-900 mb-2">Error</h3>
            <p className="text-sm text-red-800">{result.error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
