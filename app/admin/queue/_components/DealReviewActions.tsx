'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export default function DealReviewActions({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  async function activate() {
    if (!adminToken) {
      window.alert('Missing admin token. Please sign in again.')
      router.push('/admin-login')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/deals/${dealId}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data?.error || 'Failed to activate deal')
        setLoading(false)
        return
      }

      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      window.alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={activate}
        disabled={loading}
        className="px-3 py-2 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? 'Activating…' : 'Activate'}
      </button>
    </div>
  )
}

