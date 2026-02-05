'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DealExpireButton({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  async function expire() {
    if (!adminToken) {
      window.alert('Missing admin token. Please sign in again.')
      router.push('/admin-login')
      return
    }

    if (!window.confirm('Expire this deal? This will remove it from the marketplace and stop voucher issuance.')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/deals/${dealId}/expire`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data?.error || 'Failed to expire deal')
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
    <button
      onClick={expire}
      disabled={loading}
      className="text-red-700 hover:text-red-900 font-medium text-xs disabled:opacity-50"
    >
      {loading ? 'Expiring…' : 'Expire'}
    </button>
  )
}

