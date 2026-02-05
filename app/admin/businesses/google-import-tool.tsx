'use client'

import { useState } from 'react'

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
  {
    name: 'Restaurants & Dining',
    searchTerms: ['restaurant', 'cafe', 'bar', 'food'],
  },
  {
    name: 'Health & Wellness',
    searchTerms: ['gym', 'fitness', 'yoga', 'wellness'],
  },
  {
    name: 'Beauty & Spa',
    searchTerms: ['salon', 'spa', 'massage', 'nails'],
  },
  {
    name: 'Entertainment',
    searchTerms: ['entertainment', 'theater', 'attraction', 'event'],
  },
  {
    name: 'Retail & Shopping',
    searchTerms: ['retail', 'boutique', 'shop', 'store'],
  },
  {
    name: 'Services',
    searchTerms: ['service', 'contractor', 'professional service'],
  },
  {
    name: 'Activities & Recreation',
    searchTerms: ['recreation', 'sports', 'activity', 'class'],
  },
  {
    name: 'Automotive',
    searchTerms: ['auto repair', 'car service', 'auto detailing'],
  },
  {
    name: 'Home & Garden',
    searchTerms: ['landscaping', 'home improvement', 'cleaning'],
  },
  {
    name: 'Pet Services',
    searchTerms: ['pet grooming', 'veterinary', 'pet care'],
  },
  {
    name: 'Education & Classes',
    searchTerms: ['tutoring', 'lessons', 'school', 'classes'],
  },
  {
    name: 'Travel & Experiences',
    searchTerms: ['tour', 'rental', 'experience', 'adventure'],
  },
]

interface ImportResult {
  importedCount: number
  skippedCount: number
  nextPageToken: string | null
}

export function GoogleImportTool() {
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [pageToken, setPageToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    if (!selectedCity || !selectedCategory) {
      setError('Please select both city and category')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get admin token from localStorage
      const token = localStorage.getItem('adminToken')
      if (!token) {
        throw new Error('You must be logged in as an admin')
      }

      const response = await fetch('/api/admin/businesses/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: selectedCity,
          categoryId: selectedCategory,
          pageToken: pageToken || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You must be logged in as an admin')
        }
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(data.error || 'Import failed')
      }

      setResult({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
        nextPageToken: data.nextPageToken,
      })
      setPageToken(data.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Import from Google Places</h2>
        <p className="text-gray-600 text-sm mb-6">
          Select a city and category to import businesses from Google Places (max 20 results per request)
        </p>

        <div className="space-y-4 mb-6">
          {/* City Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value)
                setPageToken(null)
                setResult(null)
              }}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a city...</option>
              {LAKE_COUNTY_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPageToken(null)
                setResult(null)
              }}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a category...</option>
              {DEAL_CATEGORIES.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Import Button */}
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={!selectedCity || !selectedCategory || loading}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ Importing...' : pageToken ? 'Load Next 20' : '📥 Import'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            ✗ {error}
          </div>
        )}

        {/* Results Panel */}
        {result && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-900 mb-2">✓ Import Complete</p>
              <div className="space-y-1 text-sm text-green-800">
                <p>Records imported: <strong>{result.importedCount}</strong></p>
                <p>Records skipped (duplicates): <strong>{result.skippedCount}</strong></p>
                {result.nextPageToken ? (
                  <p className="text-blue-700 font-semibold mt-2">
                    More results available - click "Load Next 20" to continue
                  </p>
                ) : (
                  <p className="text-gray-700 mt-2">No more results for this search</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
