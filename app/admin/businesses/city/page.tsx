'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Lake County cities
const LAKE_COUNTY_CITIES = [
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
]

// Deal categories
const DEAL_CATEGORIES = [
  { id: '1', name: 'Restaurants & Dining' },
  { id: '2', name: 'Health & Wellness' },
  { id: '3', name: 'Beauty & Spa' },
  { id: '4', name: 'Entertainment' },
  { id: '5', name: 'Retail & Shopping' },
  { id: '6', name: 'Services' },
  { id: '7', name: 'Automotive' },
  { id: '8', name: 'Home & Garden' },
  { id: '9', name: 'Professional Services' },
  { id: '10', name: 'Education' },
  { id: '11', name: 'Pet Services' },
  { id: '12', name: 'Travel & Lodging' },
]

type Row = {
  id: string
  name: string
  category: string | null
  city: string | null
  lifecycle: 'Active' | 'Inactive' | 'Archived'
  claimState: 'Claimed' | 'Unclaimed'
  activeDeals: number
  publicSlug: string
}

function mapLifecycle(status: string): Row['lifecycle'] {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'DRAFT' || status === 'SUSPENDED') return 'Inactive'
  return 'Archived'
}

function mapClaimState(status: string): Row['claimState'] {
  return status === 'CLAIMED' ? 'Claimed' : 'Unclaimed'
}

export default function BusinessesByCityPage() {
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [businesses, setBusinesses] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedCity) return

    async function fetchBusinesses() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ city: selectedCity })
        if (selectedCategory) params.append('category', selectedCategory)
        
        const token = localStorage.getItem('adminToken')
        const response = await fetch(`/api/admin/businesses/by-city?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const data = await response.json()
        
        if (data.success) {
          setBusinesses(data.businesses)
        }
      } catch (error) {
        console.error('Failed to fetch businesses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBusinesses()
  }, [selectedCity, selectedCategory])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Businesses by City</h1>
        <p className="text-gray-600 mt-1">City-scoped operational view</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a city</option>
              {LAKE_COUNTY_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCity}
            >
              <option value="">All categories</option>
              {DEAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {!selectedCity && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          Select a city to view businesses
        </div>
      )}

      {selectedCity && loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          Loading businesses...
        </div>
      )}

      {selectedCity && !loading && businesses.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          No businesses found for {selectedCity}
          {selectedCategory && ` in ${selectedCategory}`}
        </div>
      )}

      {selectedCity && !loading && businesses.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="text-sm font-medium text-gray-700">
              {businesses.length} business{businesses.length !== 1 ? 'es' : ''} in {selectedCity}
              {selectedCategory && ` — ${selectedCategory}`}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Business Name</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Category</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Claim Status</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Active Deals</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {businesses.map((biz, idx) => (
                  <tr 
                    key={biz.id} 
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer`}
                    onClick={() => window.location.href = `/admin/businesses/manage/${biz.id}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <Link
                        href={`/business/${biz.publicSlug}`}
                        className="hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {biz.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{biz.category ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        biz.lifecycle === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : biz.lifecycle === 'Inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {biz.lifecycle}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        biz.claimState === 'Claimed'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {biz.claimState}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">{biz.activeDeals}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/businesses/manage/${biz.id}`}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
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
