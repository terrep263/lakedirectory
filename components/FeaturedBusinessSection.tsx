'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  city: string | null
  logoUrl: string | null
  coverUrl: string | null
  phone: string | null
  website: string | null
  isVerified: boolean
  recommendationCount: number
}

interface ApiResponse {
  count: number
  businesses: Business[]
}

export default function FeaturedBusinessSection() {
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeaturedBusinesses = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/home/featured-businesses?limit=2')
        if (!res.ok) {
          throw new Error('Failed to fetch featured businesses')
        }

        const data: ApiResponse = await res.json()
        setFeaturedBusinesses(data.businesses)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error loading featured businesses'
        )
        setFeaturedBusinesses([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedBusinesses()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 h-8 w-8" />
          <p className="mt-4 text-gray-600">Loading featured businesses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-700 font-medium">Error</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (featuredBusinesses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p className="text-lg">No featured businesses available</p>
      </div>
    )
  }

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Businesses</h2>
        <p className="text-gray-600 mb-8">
          Discover our most popular local businesses
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredBusinesses.map((business) => (
            <Link
              key={business.id}
              href={`/business/${business.slug}`}
              className="group block"
            >
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {/* Featured Banner */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-block px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                    ⭐ Featured
                  </span>
                </div>

                {/* Cover Image */}
                <div className="relative h-48 bg-gradient-to-r from-blue-500 to-blue-600 overflow-hidden">
                  {business.coverUrl ? (
                    <img
                      src={business.coverUrl}
                      alt={business.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-opacity-50">
                      No image
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {business.name}
                        </h3>
                        {business.isVerified && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600">
                            ✓
                          </span>
                        )}
                      </div>
                      {business.category && (
                        <p className="text-sm text-gray-500 mt-1">{business.category}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {business.description && (
                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {business.description}
                    </p>
                  )}

                  {/* Location & Contact */}
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    {business.city && (
                      <p className="flex items-center gap-2">
                        <span>📍</span> {business.city}
                      </p>
                    )}
                    {business.phone && (
                      <p className="flex items-center gap-2">
                        <span>📞</span>
                        <a
                          href={`tel:${business.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline"
                        >
                          {business.phone}
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <span>👍</span>
                      <span>{business.recommendationCount} recommendations</span>
                    </div>
                    <span className="text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
                      View Details →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-10 text-center">
          <Link
            href="/businesses"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Explore All Businesses
          </Link>
        </div>
      </div>
    </section>
  )
}
