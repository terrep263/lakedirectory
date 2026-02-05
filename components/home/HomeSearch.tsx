'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type HomeSearchProps = {
  cities: string[]
  categories: string[]
}

export default function HomeSearch({ cities, categories }: HomeSearchProps) {
  const router = useRouter()

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')

  const cityOptions = useMemo(() => ['Any city', ...cities], [cities])
  const categoryOptions = useMemo(() => ['Any category', ...categories], [categories])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        const query = q.trim()
        if (query) params.set('q', query)
        if (city && city !== 'Any city') params.set('city', city)
        if (category && category !== 'Any category') params.set('category', category)
        const url = params.toString() ? `/businesses?${params.toString()}` : '/businesses'
        router.push(url)
      }}
      className="w-full"
      aria-label="Search businesses"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6">
          <label className="sr-only" htmlFor="home-search-q">
            Search
          </label>
          <input
            id="home-search-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search auto repair, dentists, brunch…"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-3">
          <label className="sr-only" htmlFor="home-search-city">
            City
          </label>
          <select
            id="home-search-city"
            value={city || 'Any city'}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cityOptions.map((c) => (
              <option key={c} value={c} className="text-gray-900">
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="sr-only" htmlFor="home-search-category">
            Category
          </label>
          <select
            id="home-search-category"
            value={category || 'Any category'}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c} className="text-gray-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Search
        </button>
        <p className="text-sm text-white/90">
          Tip: leave filters blank to browse everything.
        </p>
      </div>
    </form>
  )
}

