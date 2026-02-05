'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type County = {
  id: string
  name: string
  state: string
  slug: string
}

export default function CountySwitcher({
  counties,
  currentSlug,
}: {
  counties: County[]
  currentSlug: string | null
}) {
  const router = useRouter()
  const [slug, setSlug] = useState(currentSlug || '')
  const [loading, setLoading] = useState(false)

  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  async function save() {
    if (!adminToken) {
      window.alert('Missing admin token. Please sign in again.')
      router.push('/admin-login')
      return
    }
    if (!slug) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/county-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data?.error || 'Failed to set county context')
        setLoading(false)
        return
      }

      router.push('/admin/analytics')
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      window.alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
      <div className="w-full md:w-96">
        <label className="block text-sm font-medium text-gray-700 mb-1">Active County</label>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select…</option>
          {counties.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}, {c.state} ({c.slug})
            </option>
          ))}
        </select>
        {counties.length === 0 && (
          <div className="text-sm text-gray-600 mt-2">
            No county access records found for this admin.
          </div>
        )}
      </div>
      <button
        onClick={save}
        disabled={loading || !slug}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Set County Context'}
      </button>
    </div>
  )
}

